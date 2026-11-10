import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

/**
 * Inicio de sesión (RF-01/RF-02/RF-03) — Fase 3: JWT + bcrypt en el servidor.
 * - Modos: «Entrar», «Crear cuenta» y «Olvidé mi contraseña» (código de
 *   6 dígitos al correo; en modo demo se muestra en pantalla).
 * - Errores en línea (role="alert"); el token va al store de sesión.
 */
export default function Login() {
  const [modo, setModo] = useState('login'); // 'login' | 'registro' | 'recuperar'
  const [paso, setPaso] = useState('correo'); // recuperar: 'correo' | 'codigo'
  const [correoRecuperacion, setCorreoRecuperacion] = useState('');
  const [codigoDemo, setCodigoDemo] = useState(''); // modo demo: código visible
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const usuario = useAuthStore((s) => s.usuario);

  // Si ya hay sesión, no tiene sentido el formulario
  if (usuario) {
    return (
      <div className="glass-card mx-auto flex w-full max-w-md flex-col items-center gap-3 py-10 text-center">
        <i className="fa-solid fa-circle-check text-4xl text-primary" aria-hidden="true" />
        <h1>Hola, {usuario.nombre}</h1>
        <p className="text-sm text-muted-foreground">
          Tu sesión está activa. Tus recetas se guardan en tu cuenta y las ves desde cualquier
          dispositivo.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn-primary" onClick={() => navigate('/perfil')}>
            <i className="fa-solid fa-user-pen" aria-hidden="true" /> Mi perfil
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/')}>
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  function cambiarModo(nuevo) {
    setModo(nuevo);
    setError('');
    setAviso('');
    setPaso('correo');
    setCodigoDemo('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setAviso('');
    setEnviando(true);

    const datos = Object.fromEntries(new FormData(event.currentTarget));

    try {
      if (modo === 'login' || modo === 'registro') {
        const ruta = modo === 'login' ? '/auth/login' : '/auth/registro';
        const respuesta = await api.post(ruta, datos);
        setAuth({ token: respuesta.token, usuario: respuesta.usuario });
        navigate('/', { replace: true });
        return;
      }

      // Recuperación, paso 1: pedir código
      if (paso === 'correo') {
        const respuesta = await api.post('/auth/olvide-contrasena', {
          correo: datos.correo,
        });
        setCorreoRecuperacion(datos.correo);
        if (respuesta.codigo) {
          setCodigoDemo(respuesta.codigo); // modo demo: se muestra en pantalla
          setPaso('codigo');
        } else {
          setAviso(
            'Si el correo existe, recibirás un código de 6 dígitos. Revisa tu bandeja de entrada.',
          );
        }
        return;
      }

      // Recuperación, paso 2: validar código y nueva contraseña
      await api.post('/auth/restablecer-contrasena', {
        correo: correoRecuperacion,
        codigo: datos.codigo,
        contrasena: datos.contrasena,
      });
      cambiarModo('login');
      setAviso('¡Contraseña actualizada! Ya puedes iniciar sesión.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error inesperado. Reintenta.');
    } finally {
      setEnviando(false);
    }
  }

  const esRegistro = modo === 'registro';
  const esRecuperar = modo === 'recuperar';

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <header className="text-center">
        <span
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl text-primary-foreground"
          aria-hidden="true"
        >
          <i
            className={`fa-solid ${esRegistro ? 'fa-user-plus' : esRecuperar ? 'fa-key' : 'fa-user'}`}
          />
        </span>
        <h1>
          {esRegistro ? 'Crear cuenta' : esRecuperar ? 'Restablecer contraseña' : 'Iniciar sesión'}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {esRegistro
            ? 'Crea tu cuenta gratis y tus recetas quedarán guardadas en la nube: las ves desde cualquier dispositivo.'
            : esRecuperar
              ? 'Te enviaremos un código de 6 dígitos a tu correo para confirmar que eres tú.'
              : 'Accede para crear recetas, favoritos y sincronizar tus preferencias.'}
        </p>
      </header>

      <form className="glass-card flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {esRegistro && (
          <div>
            <label htmlFor="nombre" className="mb-1 block text-sm font-medium">
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              className="field"
              autoComplete="name"
              placeholder="Tu nombre"
              minLength={2}
              maxLength={80}
              required
            />
          </div>
        )}

        {/* Recuperación: el correo se congela en el paso 2 */}
        {!(esRecuperar && paso === 'codigo') && (
          <div>
            <label htmlFor="correo" className="mb-1 block text-sm font-medium">
              Correo electrónico
            </label>
            <input
              id="correo"
              name="correo"
              type="email"
              className="field"
              autoComplete="username"
              placeholder="tu@correo.com"
              defaultValue={esRecuperar ? correoRecuperacion : ''}
              required
            />
          </div>
        )}

        {esRecuperar && paso === 'codigo' && (
          <>
            <p className="rounded-xl bg-primary/10 p-3 text-sm" role="status">
              <i className="fa-solid fa-envelope text-primary" aria-hidden="true" /> Código enviado
              a <strong>{correoRecuperacion}</strong>
              {codigoDemo && (
                <>
                  {' '}
                  · <span className="font-mono font-bold">{codigoDemo}</span>{' '}
                  <span className="text-xs text-muted-foreground">
                    (modo demo: sin servidor de correo configurado)
                  </span>
                </>
              )}
            </p>
            <div>
              <label htmlFor="codigo" className="mb-1 block text-sm font-medium">
                Código de 6 dígitos
              </label>
              <input
                id="codigo"
                name="codigo"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                className="field text-center font-mono text-lg tracking-[0.4em]"
                placeholder="000000"
                autoComplete="one-time-code"
                required
              />
            </div>
          </>
        )}

        {/* Contraseña: en recuperación solo en el paso 2 */}
        {!(esRecuperar && paso === 'correo') && (
          <div>
            <label htmlFor="contrasena" className="mb-1 block text-sm font-medium">
              {esRecuperar ? 'Nueva contraseña' : 'Contraseña'}
            </label>
            <input
              id="contrasena"
              name="contrasena"
              type="password"
              className="field"
              autoComplete={esRegistro || esRecuperar ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              minLength={8}
              required
            />
            {(esRegistro || esRecuperar) && (
              <p className="mt-1 text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
            )}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={enviando}>
          <i
            className={`fa-solid ${enviando ? 'fa-spinner fa-spin' : esRegistro ? 'fa-user-plus' : esRecuperar ? 'fa-paper-plane' : 'fa-right-to-bracket'}`}
            aria-hidden="true"
          />
          {enviando
            ? 'Un momento…'
            : esRegistro
              ? 'Crear cuenta'
              : esRecuperar
                ? paso === 'correo'
                  ? 'Enviar código'
                  : 'Restablecer contraseña'
                : 'Entrar'}
        </button>

        {esRecuperar ? (
          <button type="button" className="btn-ghost" onClick={() => cambiarModo('login')}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Volver a iniciar sesión
          </button>
        ) : (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => cambiarModo(esRegistro ? 'login' : 'registro')}
          >
            {esRegistro ? 'Ya tengo cuenta — iniciar sesión' : 'Crear una cuenta nueva'}
          </button>
        )}

        {!esRecuperar && !esRegistro && (
          <button
            type="button"
            className="text-center text-sm text-muted-foreground underline hover:text-foreground"
            onClick={() => cambiarModo('recuperar')}
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}

        {error && (
          <p role="alert" className="text-center text-sm font-medium text-danger">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
          </p>
        )}
        {aviso && (
          <p role="status" className="text-center text-sm font-medium text-primary">
            <i className="fa-solid fa-circle-check" aria-hidden="true" /> {aviso}
          </p>
        )}
      </form>

      <p className="text-center text-xs text-muted-foreground">
        <i className="fa-solid fa-shield-halved" aria-hidden="true" /> Contraseñas cifradas con
        bcrypt · Sesión con JWT de 7 días.
      </p>
    </div>
  );
}
