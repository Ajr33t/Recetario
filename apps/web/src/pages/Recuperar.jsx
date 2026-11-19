import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../services/api.js';
import { exito } from '../services/toast.js';
import CampoContrasena from '../components/ui/CampoContrasena.jsx';

/**
 * Recuperación de contraseña por **enlace de un clic** (Fase 10).
 * El correo de recuperación incluye un enlace `/#/recuperar?token=...`;
 * al abrirlo, el usuario solo tiene que escribir la contraseña nueva.
 */
export default function Recuperar() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.search || '').get('token') || '';
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (contrasena.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (contrasena !== confirmacion) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setEnviando(true);
    try {
      await api.post('/auth/restablecer-contrasena', { token, contrasena });
      setListo(true);
      exito('¡Contraseña actualizada!');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar la contraseña');
    } finally {
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <div className="glass-card mx-auto flex w-full max-w-md flex-col items-center gap-3 py-10 text-center">
        <i className="fa-solid fa-link-slash text-4xl text-primary" aria-hidden="true" />
        <h1>Enlace no válido</h1>
        <p className="text-sm text-muted-foreground">
          Este enlace de recuperación está incompleto o ya se usó. Pide uno nuevo desde el inicio de
          sesión.
        </p>
        <Link to="/login" className="btn-primary mt-1">
          <i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  if (listo) {
    return (
      <div className="glass-card mx-auto flex w-full max-w-md flex-col items-center gap-3 py-10 text-center">
        <i className="fa-solid fa-circle-check text-4xl text-primary" aria-hidden="true" />
        <h1>¡Contraseña actualizada!</h1>
        <p className="text-sm text-muted-foreground">
          Ya puedes iniciar sesión con tu nueva contraseña.
        </p>
        <button type="button" className="btn-primary mt-1" onClick={() => navigate('/login')}>
          <i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <header className="text-center">
        <span
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl text-primary-foreground"
          aria-hidden="true"
        >
          <i className="fa-solid fa-key" />
        </span>
        <h1>Restablecer contraseña</h1>
        <p className="mt-1 text-muted-foreground">
          Enlace verificado. Escribe tu contraseña nueva para entrar a SazónLab.
        </p>
      </header>

      <form className="glass-card flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <CampoContrasena
          label="Contraseña nueva"
          id="nueva-clave"
          name="contrasena"
          autoComplete="new-password"
          minLength={8}
          required
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          hint="Mínimo 8 caracteres."
        />
        <CampoContrasena
          label="Repite la contraseña"
          id="confirmar-clave"
          name="confirmacion"
          autoComplete="new-password"
          required
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
        />

        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={enviando}>
          <i
            className={`fa-solid ${enviando ? 'fa-spinner fa-spin' : 'fa-check'}`}
            aria-hidden="true"
          />
          {enviando ? ' Guardando…' : ' Guardar contraseña'}
        </button>

        <Link to="/login" className="btn-ghost !px-3">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Volver al inicio de sesión
        </Link>
      </form>
    </div>
  );
}
