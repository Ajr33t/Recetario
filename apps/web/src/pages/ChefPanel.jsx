import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api, ApiError } from '../services/api.js';
import { exito, fracaso } from '../services/toast.js';
import { useAuthStore } from '../store/authStore.js';
import Modal from '../components/ui/Modal.jsx';
import { ALERGENOS, detectarAlergenos, etiquetaAlergeno, iconoAlergeno } from '../data/alergenos.js';
import PersonalizarCarta from '../components/carta/PersonalizarCarta.jsx';
import GenerarQR from '../components/carta/GenerarQR.jsx';

/** Formatea precio sin fijar una divisa concreta. */
function formatearPrecio(valor) {
  return Number(valor || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Panel del rol Chef/Restaurante (punto 3 del encargo):
 * - Carta propia: agregar recetas como platos con precio, categoría,
 *   alérgenos (precargados y editables) y composición visible.
 * - Accesos directos a pedidos, recetas, carta digital y personalización.
 * No modifica los flujos de admin/usuario/invitado.
 */
export default function ChefPanel() {
  const usuario = useAuthStore((s) => s.usuario);

  const [platos, setPlatos] = useState(null); // null = cargando
  const [recetas, setRecetas] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // null | { plato? }
  const [personalizar, setPersonalizar] = useState(false);
  const [qrAbierto, setQrAbierto] = useState(false);
  const [form, setForm] = useState({
    receta_id: '',
    precio: '',
    categoria: '',
    alergenos: [],
    composicion: '',
  });
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);

  /** Carga los platos de la carta del chef. */
  async function cargarPlatos() {
    try {
      const datos = await api.get('/carta/platos');
      setPlatos(datos.platos);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la carta');
      setPlatos([]);
    }
  }

  useEffect(() => {
    if (!usuario || usuario.rol !== 'chef') return;
    cargarPlatos();
    api
      .get('/recipes')
      .then((datos) => setRecetas(datos.recetas || []))
      .catch(() => setRecetas([]));
  }, [usuario]);

  /** Abre el alta: precarga alérgenos y composición desde la receta elegida. */
  function abrirNuevo() {
    setForm({ receta_id: '', precio: '', categoria: '', alergenos: [], composicion: '' });
    setErrorForm('');
    setModal({});
  }

  /** Abre la edición de un plato existente. */
  function abrirEditar(plato) {
    setForm({
      receta_id: String(plato.receta_id),
      precio: String(plato.precio),
      categoria: plato.categoria || '',
      alergenos: [...(plato.alergenos || [])],
      composicion: plato.composicion || '',
    });
    setErrorForm('');
    setModal({ plato });
  }

  /** Al elegir receta en el alta, precarga alérgenos y composición. */
  function elegirReceta(id) {
    const receta = (recetas || []).find((r) => String(r.id) === String(id));
    const ingredientes = receta?.ingredientes || [];
    const composicion = ingredientes
      .map((i) =>
        i.cantidad ? `${i.nombre} ${i.cantidad}${i.unidad ? ` ${i.unidad}` : ''}` : i.nombre,
      )
      .join(', ');
    setForm((f) => ({
      ...f,
      receta_id: String(id),
      alergenos: receta?.alergenos?.length
        ? [...receta.alergenos]
        : detectarAlergenos(ingredientes),
      composicion: composicion || f.composicion,
    }));
  }

  /** Alterna un alérgeno en el formulario. */
  function alternarAlergeno(clave) {
    setForm((f) => ({
      ...f,
      alergenos: f.alergenos.includes(clave)
        ? f.alergenos.filter((a) => a !== clave)
        : [...f.alergenos, clave],
    }));
  }

  /** Guarda el plato (alta o edición). */
  async function guardar() {
    const precio = Number(String(form.precio).replace(',', '.'));
    if (!Number.isFinite(precio) || precio < 0) {
      setErrorForm('Indica un precio válido (número mayor o igual a 0).');
      return;
    }
    if (!modal.plato && !form.receta_id) {
      setErrorForm('Elige una receta para el plato.');
      return;
    }

    const cuerpo = {
      precio,
      categoria: form.categoria.trim() || null,
      alergenos: form.alergenos,
      composicion: form.composicion.trim() || null,
    };
    if (!modal.plato) cuerpo.receta_id = Number(form.receta_id);

    setGuardando(true);
    try {
      if (modal.plato) {
        await api.put(`/carta/platos/${modal.plato.id}`, cuerpo);
        exito('Plato actualizado');
      } else {
        await api.post('/carta/platos', cuerpo);
        exito('Plato agregado a la carta');
      }
      setModal(null);
      await cargarPlatos();
    } catch (err) {
      setErrorForm(err instanceof ApiError ? err.message : 'No se pudo guardar el plato');
    } finally {
      setGuardando(false);
    }
  }

  /** Activa/desactiva un plato (visible o no en la carta pública). */
  async function cambiarActivo(plato) {
    try {
      await api.put(`/carta/platos/${plato.id}`, { activo: !plato.activo });
      await cargarPlatos();
      exito(plato.activo ? 'Plato oculto de la carta' : 'Plato visible en la carta');
    } catch (err) {
      fracaso(err instanceof ApiError ? err.message : 'No se pudo cambiar la visibilidad');
    }
  }

  /** Quita un plato de la carta (no borra la receta). */
  async function eliminar(plato) {
    const confirmar = await Swal.fire({
      title: `¿Quitar ${plato.titulo} de la carta?`,
      text: 'La receta se conserva; solo desaparece de tu carta.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!confirmar.isConfirmed) return;
    try {
      await api.delete(`/carta/platos/${plato.id}`);
      exito('Plato quitado de la carta');
      await cargarPlatos();
    } catch (err) {
      fracaso(err instanceof ApiError ? err.message : 'No se pudo quitar el plato');
    }
  }

  if (!usuario || usuario.rol !== 'chef') {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1>Panel del chef</h1>
          <p className="mt-1 text-muted-foreground">
            Tu carta, tus platos y tus pedidos en un solo lugar.
          </p>
        </header>
        <div className="glass-card flex flex-col items-center gap-3 py-10 text-center">
          <i className="fa-solid fa-user-tie text-4xl text-primary" aria-hidden="true" />
          <p className="font-medium">
            {!usuario
              ? 'Inicia sesión para acceder al panel'
              : 'Esta sección es solo para cuentas Chef/Restaurante'}
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            {!usuario
              ? 'El panel se asocia a tu cuenta de chef.'
              : 'Pide al administrador que cambie tu tipo de cuenta a Chef/Restaurante.'}
          </p>
          <Link to={usuario ? '/' : '/login'} className="btn-secondary mt-1">
            <i className="fa-solid fa-house" aria-hidden="true" />{' '}
            {usuario ? 'Volver al inicio' : 'Iniciar sesión'}
          </Link>
        </div>
      </div>
    );
  }

  // Recetas aún no elegidas en la carta (para el desplegable del alta).
  const idsEnCarta = new Set((platos || []).map((p) => p.receta_id));
  const recetasLibres = (recetas || []).filter((r) => !idsEnCarta.has(r.id));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Panel del chef</h1>
          <p className="mt-1 text-muted-foreground">
            Gestiona tu carta, personalízala y atiende tus pedidos.
          </p>
        </div>
        <button type="button" className="btn-primary !px-3" onClick={abrirNuevo}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> Agregar plato
        </button>
      </header>

      {/* Accesos directos, siempre visibles (sin menús escondidos) */}
      <nav aria-label="Herramientas del chef" className="flex flex-wrap gap-2">
        <Link to="/pedidos" className="btn-secondary !px-3">
          <i className="fa-solid fa-receipt" aria-hidden="true" /> Mis pedidos
        </Link>
        <Link to="/mis-recetas" className="btn-secondary !px-3">
          <i className="fa-solid fa-book-open" aria-hidden="true" /> Mis recetas
        </Link>
        <Link to={`/carta/${usuario.id}`} className="btn-secondary !px-3">
          <i className="fa-solid fa-qrcode" aria-hidden="true" /> Ver carta digital
        </Link>
        <button type="button" className="btn-secondary !px-3" onClick={() => setPersonalizar(true)}>
          <i className="fa-solid fa-palette" aria-hidden="true" /> Personalizar carta
        </button>
        <button type="button" className="btn-secondary !px-3" onClick={() => setQrAbierto(true)}>
          <i className="fa-solid fa-qrcode" aria-hidden="true" /> Generar QR
        </button>
      </nav>

      {error && (
        <p role="alert" className="glass-card text-sm font-medium text-danger">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      {platos === null && (
        <p className="text-sm text-muted-foreground" role="status">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando la carta…
        </p>
      )}

      {platos?.length === 0 && !error && (
        <div className="glass-card flex flex-col items-center gap-2 py-10 text-center">
          <i className="fa-solid fa-book-open text-4xl text-primary" aria-hidden="true" />
          <p className="font-medium">Tu carta está vacía</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Agrega tus recetas como platos para ponerles precio, categoría y alérgenos.
          </p>
          <button type="button" className="btn-primary mt-1" onClick={abrirNuevo}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Agregar el primer plato
          </button>
        </div>
      )}

      {platos?.length > 0 && (
        <section aria-labelledby="titulo-carta" className="flex flex-col gap-3">
          <h2 id="titulo-carta" className="text-lg">
            Mi carta <span className="text-sm font-normal text-muted-foreground">({platos.length} platos)</span>
          </h2>
          <ul className="grid gap-3 md:grid-cols-2" role="list">
            {platos.map((plato) => (
              <li key={plato.id} className="glass-card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{plato.titulo}</h3>
                    <p className="text-xs text-muted-foreground">
                      {plato.categoria || 'Sin categoría'}
                      {!plato.activo && ' · Oculto en la carta pública'}
                    </p>
                  </div>
                  <span className="shrink-0 text-lg font-semibold text-primary">
                    {formatearPrecio(plato.precio)}
                  </span>
                </div>

                {plato.composicion && (
                  <p className="text-sm text-muted-foreground">
                    <i className="fa-solid fa-list-check" aria-hidden="true" /> {plato.composicion}
                  </p>
                )}

                {plato.alergenos?.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5" aria-label="Alérgenos del plato" role="list">
                    {plato.alergenos.map((a) => (
                      <li key={a} className="chip !px-2 !py-0.5 !text-[11px]" title={etiquetaAlergeno(a)}>
                        <span aria-hidden="true">{iconoAlergeno(a)}</span> {etiquetaAlergeno(a)}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto flex flex-wrap gap-2">
                  <button type="button" className="btn-ghost !px-3 !text-xs" onClick={() => abrirEditar(plato)}>
                    <i className="fa-solid fa-pen" aria-hidden="true" /> Editar
                  </button>
                  <button type="button" className="btn-ghost !px-3 !text-xs" onClick={() => cambiarActivo(plato)}>
                    <i className={`fa-solid ${plato.activo ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />{' '}
                    {plato.activo ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !px-3 !text-xs text-danger"
                    onClick={() => eliminar(plato)}
                    aria-label={`Quitar ${plato.titulo} de la carta`}
                  >
                    <i className="fa-solid fa-trash-can" aria-hidden="true" /> Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ===== Modal alta / edición de plato ===== */}
      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        labelledBy="titulo-form-plato"
        className="max-w-xl"
      >
        <h2 id="titulo-form-plato" className="text-lg font-semibold">
          <i className="fa-solid fa-utensils text-primary" aria-hidden="true" />{' '}
          {modal?.plato ? 'Editar plato' : 'Agregar plato a la carta'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Precio, categoría, alérgenos y composición que verán tus comensales.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Receta *
            <select
              className="field"
              value={form.receta_id}
              disabled={Boolean(modal?.plato)}
              onChange={(e) => elegirReceta(e.target.value)}
            >
              <option value="">Elige una receta…</option>
              {modal?.plato ? (
                <option value={form.receta_id}>{modal.plato.titulo}</option>
              ) : (
                recetasLibres.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.titulo}
                  </option>
                ))
              )}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Precio *
              <input
                type="number"
                min="0"
                step="0.01"
                className="field"
                value={form.precio}
                onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
                placeholder="0.00"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Categoría
              <input
                type="text"
                className="field"
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                placeholder="Ej. Entradas, platos fuertes…"
              />
            </label>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">
              Alérgenos <span className="font-normal text-muted-foreground">(precargados desde la receta, editable)</span>
            </legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Alérgenos del plato">
              {ALERGENOS.map(({ clave, etiqueta, icono }) => {
                const marcado = form.alergenos.includes(clave);
                return (
                  <label
                    key={clave}
                    className={`chip cursor-pointer !px-2 !py-1 !text-[11px] ${marcado ? '!border-primary !bg-primary/15 !text-primary' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={marcado}
                      onChange={() => alternarAlergeno(clave)}
                    />
                    <span aria-hidden="true">{icono}</span> {etiqueta}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1 text-sm">
            Composición visible
            <textarea
              className="field min-h-20"
              value={form.composicion}
              onChange={(e) => setForm((f) => ({ ...f, composicion: e.target.value }))}
              placeholder="Ingredientes que contendrá el plato"
            />
          </label>

          {errorForm && (
            <p role="alert" className="text-sm font-medium text-danger">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {errorForm}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost !px-3" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary !px-3" onClick={guardar} disabled={guardando}>
              {guardando ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Guardando…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check" aria-hidden="true" /> Guardar plato
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <PersonalizarCarta open={personalizar} onClose={() => setPersonalizar(false)} />
      <GenerarQR
        open={qrAbierto}
        onClose={() => setQrAbierto(false)}
        userId={usuario?.id}
        nombre="Escanea mi carta"
      />
    </div>
  );
}
