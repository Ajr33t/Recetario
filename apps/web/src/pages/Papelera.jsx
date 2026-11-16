import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api, ApiError } from '../services/api.js';
import { exito } from '../services/toast.js';
import { useAuthStore } from '../store/authStore.js';

/**
 * Papelera (RF-08 / CU-10 — Fase 5): recetas eliminadas con borrado
 * suave (retención 30 días), con restaurar y borrado permanente
 * (confirmado con SweetAlert2).
 */
export default function Papelera() {
  const usuario = useAuthStore((s) => s.usuario);
  const [recetas, setRecetas] = useState(null);
  const [error, setError] = useState('');

  function cargar() {
    api
      .get('/recipes?estado=papelera')
      .then((datos) => setRecetas(datos.recetas))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la papelera');
        setRecetas([]);
      });
  }

  useEffect(() => {
    if (!usuario) {
      setRecetas([]);
      return;
    }
    cargar();
  }, [usuario]);

  async function restaurar(receta) {
    try {
      await api.post(`/recipes/${receta.id}/restaurar`, {});
      exito('Receta restaurada');
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo restaurar.');
    }
  }

  async function borrarPermanente(receta) {
    const resultado = await Swal.fire({
      icon: 'error',
      title: '¿Borrar definitivamente?',
      html: `Se eliminará <strong>«${receta.titulo}»</strong> para siempre: ingredientes, pasos, versiones y favoritos. <em>No se puede deshacer.</em>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar para siempre',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      input: 'checkbox',
      inputValue: 0,
      inputValidator: (valor) => (valor ? undefined : 'Confirma la casilla para continuar'),
    });
    if (!resultado.isConfirmed) return;
    try {
      await api.delete(`/recipes/${receta.id}?permanente=1`);
      exito('Eliminada definitivamente');
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar.');
    }
  }

  if (!usuario) {
    return (
      <div className="glass-card flex flex-col items-center gap-3 py-10 text-center">
        <i className="fa-solid fa-lock text-4xl text-primary" aria-hidden="true" />
        <p className="font-medium">Inicia sesión para ver la papelera</p>
        <Link to="/login" className="btn-primary mt-1">
          <i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Papelera</h1>
          <p className="mt-1 text-muted-foreground">
            Las recetas eliminadas se conservan 30 días antes de borrarse solas.
          </p>
        </div>
        <Link to="/mis-recetas" className="btn-ghost !px-3">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Mis recetas
        </Link>
      </header>

      {error && (
        <p role="alert" className="glass-card text-sm font-medium text-danger">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      {recetas === null && (
        <p className="text-sm text-muted-foreground" role="status">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando papelera…
        </p>
      )}

      {recetas?.length === 0 && !error && (
        <div className="glass-card flex flex-col items-center gap-2 py-10 text-center">
          <i className="fa-solid fa-trash-can-arrow-up text-4xl text-primary" aria-hidden="true" />
          <p className="font-medium">La papelera está vacía</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Todo lo que elimines aparecerá aquí para que puedas restaurarlo.
          </p>
        </div>
      )}

      {recetas?.length > 0 && (
        <ul className="flex flex-col gap-3" role="list">
          {recetas.map((receta) => (
            <li
              key={receta.id}
              className="glass-card flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <h2 className="text-base">{receta.titulo}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  <i className="fa-solid fa-clock" aria-hidden="true" /> eliminada el{' '}
                  {receta.deleted_at
                    ? new Date(
                        String(receta.deleted_at).replace(' ', 'T') + 'Z',
                      ).toLocaleDateString('es-ES')
                    : '—'}{' '}
                  · se borra automáticamente a los 30 días
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary !px-3 !text-sm"
                  onClick={() => restaurar(receta)}
                >
                  <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Restaurar
                </button>
                <button
                  type="button"
                  className="btn-ghost !px-3 !text-sm text-danger"
                  onClick={() => borrarPermanente(receta)}
                >
                  <i className="fa-solid fa-fire" aria-hidden="true" /> Borrar para siempre
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
