import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api, ApiError } from '../services/api.js';
import { exito, fracaso } from '../services/toast.js';
import { useAuthStore } from '../store/authStore.js';

// Avatares disponibles (iconos de Font Awesome Free)
const AVATARES = [
  'fa-user-astronaut',
  'fa-user-ninja',
  'fa-user-tie',
  'fa-face-grin-stars',
  'fa-paw',
  'fa-leaf',
  'fa-fire',
  'fa-heart',
  'fa-star',
  'fa-rocket',
  'fa-mug-hot',
  'fa-pizza-slice',
];

// Colores de acento predefinidos
const COLORES = [
  '#0369a1',
  '#059669',
  '#dc2626',
  '#7c3aed',
  '#db2777',
  '#d97706',
  '#0891b2',
  '#1f2937',
];

/**
 * Recorta y comprime una imagen subida a un cuadrado de 256px (JPEG)
 * directamente en el navegador: sin librerías y sin datos pesados.
 * @returns {Promise<string>} data URL lista para guardar en el servidor
 */
function procesarImagen(file, tamano = 256) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image')) {
      reject(new Error('El archivo debe ser una imagen'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('La imagen no puede pasar de 8 MB'));
      return;
    }
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer la imagen'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no soportado'));
      img.onload = () => {
        // Recorte cuadrado "cover" centrado
        const lado = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = tamano;
        canvas.height = tamano;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          img,
          (img.width - lado) / 2,
          (img.height - lado) / 2,
          lado,
          lado,
          0,
          0,
          tamano,
          tamano,
        );
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(file);
  });
}

/**
 * Mi perfil (Fase 3): personalización completa de la cuenta —
 * foto de perfil (subida con recorte automático), avatar-icono, nombre,
 * bio y color de acento — más estadísticas, cambio de contraseña y
 * cierre de sesión. Todo se guarda en el servidor (visible en cualquier
 * dispositivo al iniciar sesión).
 */
export default function Perfil() {
  const navigate = useNavigate();
  const usuario = useAuthStore((s) => s.usuario);
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

  const [nombre, setNombre] = useState(usuario?.nombre || '');
  const [avatar, setAvatar] = useState(usuario?.avatar || 'fa-user');
  const [foto, setFoto] = useState(usuario?.avatar_imagen || null);
  const [color, setColor] = useState(usuario?.color_perfil || '#0369a1');
  const [bio, setBio] = useState(usuario?.bio || '');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [errorFoto, setErrorFoto] = useState('');
  const [numRecetas, setNumRecetas] = useState(null);

  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passAviso, setPassAviso] = useState('');
  const [passError, setPassError] = useState('');

  // Estadísticas de la cuenta (nº de recetas guardadas)
  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    api
      .get('/recipes')
      .then((datos) => vivo && setNumRecetas(datos.recetas.length))
      .catch(() => vivo && setNumRecetas('—'));
    return () => {
      vivo = false;
    };
  }, [usuario]);

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  async function subirFoto(event) {
    const archivo = event.target.files?.[0];
    event.target.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    setErrorFoto('');
    try {
      const dataUrl = await procesarImagen(archivo);
      setFoto(dataUrl);
    } catch (err) {
      setErrorFoto(err.message);
    }
  }

  async function guardarPerfil(event) {
    event.preventDefault();
    setGuardando(true);
    setAviso('');
    setError('');
    try {
      const respuesta = await api.put('/auth/perfil', {
        nombre,
        avatar,
        avatar_imagen: foto,
        color_perfil: color,
        bio,
      });
      setAuth({ token, usuario: respuesta.usuario });
      setAviso('Perfil actualizado ✓');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el perfil');
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarContrasena(event) {
    event.preventDefault();
    setPassAviso('');
    setPassError('');
    if (passNueva.length < 8) {
      setPassError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    setGuardando(true);
    try {
      const respuesta = await api.post('/auth/cambiar-contrasena', {
        actual: passActual,
        nueva: passNueva,
      });
      setPassAviso(respuesta.mensaje || 'Contraseña actualizada ✓');
      setPassActual('');
      setPassNueva('');
    } catch (err) {
      setPassError(err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña');
    } finally {
      setGuardando(false);
    }
  }

  /**
   * Flujo de eliminación de cuenta (Fase 7): confirmación → código de
   * 6 dígitos al correo → borrado definitivo + cierre de sesión.
   */
  async function eliminarCuenta() {
    const confirmar = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar tu cuenta?',
      text: 'Esta acción es irreversible: se borrarán tus recetas, favoritos, búsquedas y preferencias. Te enviaremos un código de confirmación a tu correo.',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar código',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b91c1c',
      reverseButtons: true,
    });
    if (!confirmar.isConfirmed) return;

    try {
      const r = await api.post('/auth/solicitar-eliminacion', {});
      const pedir = await Swal.fire({
        icon: 'info',
        title: 'Código de confirmación',
        text: `Enviamos un código de 6 dígitos a ${usuario.correo}. Escríbelo para eliminar la cuenta.`,
        input: 'text',
        inputValue: r.codigo || '',
        inputLabel: 'Código de 6 dígitos',
        inputAttributes: { maxlength: 6, autocomplete: 'one-time-code', inputmode: 'numeric' },
        inputValidator: (valor) =>
          /^\d{6}$/.test(valor || '') ? null : 'El código debe tener 6 dígitos',
        showCancelButton: true,
        confirmButtonText: 'Eliminar definitivamente',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#b91c1c',
        reverseButtons: true,
      });
      if (!pedir.isConfirmed) return;

      await api.post('/auth/eliminar-cuenta', { codigo: pedir.value });
      exito('Cuenta eliminada definitivamente');
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      fracaso(err instanceof ApiError ? err.message : 'No se pudo eliminar la cuenta');
    }
  }

  const miembroDesde = usuario.creado_en
    ? new Date(usuario.creado_en + 'Z').toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1>Mi perfil</h1>
        <p className="mt-1 text-muted-foreground">
          Personaliza tu cuenta: foto, avatar, color, nombre y bio. Los cambios se guardan en el
          servidor y te siguen a cualquier dispositivo.
        </p>
      </header>

      {/* Tarjeta de identidad + estadísticas */}
      <section className="surface-section" aria-labelledby="datos-titulo">
        <h2 id="datos-titulo">
          <i className="fa-solid fa-user-pen text-primary" aria-hidden="true" /> Personalización
        </h2>

        {/* Vista previa */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <span
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full text-4xl text-white"
            style={{ background: color }}
            aria-hidden="true"
          >
            {foto ? (
              <img src={foto} alt="" className="h-full w-full object-cover" />
            ) : (
              <i className={`fa-solid ${avatar}`} />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{nombre || 'Sin nombre'}</p>
            <p className="truncate text-sm text-muted-foreground">{usuario.correo}</p>
            {bio && <p className="mt-1 text-sm text-muted-foreground">{bio}</p>}
          </div>

          {/* Estadísticas de la cuenta */}
          <ul className="ml-auto flex gap-6" role="list">
            <li className="text-center">
              <p className="text-2xl font-bold text-primary">{numRecetas ?? '…'}</p>
              <p className="text-xs text-muted-foreground">recetas</p>
            </li>
            <li className="text-center">
              <p className="text-2xl font-bold text-primary">
                <i className="fa-solid fa-heart text-lg" aria-hidden="true" />
              </p>
              <p className="text-xs text-muted-foreground">favoritos</p>
            </li>
            <li className="text-center">
              <p className="text-lg font-bold text-primary">
                {miembroDesde ? ` ${miembroDesde}` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">miembro desde</p>
            </li>
          </ul>
        </div>

        <form onSubmit={guardarPerfil} className="mt-4 flex flex-col gap-5">
          {/* Foto de perfil */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">
              <i className="fa-solid fa-camera" aria-hidden="true" /> Foto de perfil
            </legend>
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn-secondary cursor-pointer">
                <i className="fa-solid fa-upload" aria-hidden="true" /> Subir foto
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={subirFoto}
                  aria-label="Subir foto de perfil"
                />
              </label>
              {foto && (
                <button
                  type="button"
                  className="btn-ghost !text-danger"
                  onClick={() => setFoto(null)}
                >
                  <i className="fa-solid fa-trash" aria-hidden="true" /> Quitar foto
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                Se recorta en cuadrado y se comprime automáticamente (máx. 8 MB → se guarda
                optimizada).
              </span>
            </div>
            {errorFoto && (
              <p role="alert" className="mt-2 text-sm font-medium text-danger">
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {errorFoto}
              </p>
            )}
          </fieldset>

          {/* Avatar-icono (se usa si no hay foto) */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">
              Avatar-icono {foto && '(detrás de la foto)'}
            </legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Elegir avatar">
              {AVATARES.map((icono) => (
                <label
                  key={icono}
                  className={`glass flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-lg ${
                    avatar === icono ? 'ring-2 ring-primary' : ''
                  }`}
                  title={icono.replace('fa-', '')}
                >
                  <input
                    type="radio"
                    name="avatar"
                    value={icono}
                    checked={avatar === icono}
                    onChange={() => setAvatar(icono)}
                    className="sr-only"
                  />
                  <i className={`fa-solid ${icono}`} aria-hidden="true" />
                  <span className="sr-only">Avatar {icono.replace('fa-', '')}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Color de acento */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">
              <i className="fa-solid fa-palette" aria-hidden="true" /> Color de acento
            </legend>
            <div className="flex flex-wrap items-center gap-2">
              {COLORES.map((c) => (
                <label
                  key={c}
                  className={`h-9 w-9 cursor-pointer rounded-full border-2 ${
                    color.toLowerCase() === c
                      ? 'border-foreground ring-2 ring-primary'
                      : 'border-transparent'
                  }`}
                  style={{ background: c }}
                  title={c}
                >
                  <input
                    type="radio"
                    name="color-perfil"
                    value={c}
                    checked={color.toLowerCase() === c}
                    onChange={() => setColor(c)}
                    className="sr-only"
                  />
                  <span className="sr-only">Color {c}</span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-border bg-transparent"
                  aria-label="Elegir color personalizado"
                />
                Personalizado
              </label>
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="perfil-nombre" className="mb-1 block text-sm font-medium">
                Nombre
              </label>
              <input
                id="perfil-nombre"
                className="field"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
            </div>

            <div>
              <label htmlFor="perfil-correo" className="mb-1 block text-sm font-medium">
                Correo electrónico
              </label>
              <input
                id="perfil-correo"
                className="field opacity-70"
                value={usuario.correo}
                readOnly
                disabled
              />
              <p className="mt-1 text-xs text-muted-foreground">
                El correo no se puede cambiar (es tu identidad en la cuenta).
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="perfil-bio" className="mb-1 block text-sm font-medium">
              Bio
            </label>
            <textarea
              id="perfil-bio"
              className="field min-h-20 resize-y"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              placeholder="Cuéntanos algo de ti (máx. 200 caracteres)"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{bio.length}/200</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primary" disabled={guardando}>
              <i
                className={`fa-solid ${guardando ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}
                aria-hidden="true"
              />
              Guardar cambios
            </button>
            {aviso && (
              <span role="status" className="text-sm font-medium text-primary">
                {aviso}
              </span>
            )}
            {error && (
              <span role="alert" className="text-sm font-medium text-danger">
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Seguridad */}
      <section className="surface-section" aria-labelledby="seguridad-titulo">
        <h2 id="seguridad-titulo">
          <i className="fa-solid fa-shield-halved text-primary" aria-hidden="true" /> Seguridad
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ¿La olvidaste? También puedes restablecerla desde{' '}
          <span className="text-foreground">Iniciar sesión → ¿Olvidaste tu contraseña?</span>
        </p>

        <form onSubmit={cambiarContrasena} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="pass-actual" className="mb-1 block text-sm font-medium">
              Contraseña actual
            </label>
            <input
              id="pass-actual"
              type="password"
              className="field"
              autoComplete="current-password"
              value={passActual}
              onChange={(e) => setPassActual(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="pass-nueva" className="mb-1 block text-sm font-medium">
              Nueva contraseña
            </label>
            <input
              id="pass-nueva"
              type="password"
              className="field"
              autoComplete="new-password"
              minLength={8}
              value={passNueva}
              onChange={(e) => setPassNueva(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button type="submit" className="btn-secondary" disabled={guardando}>
              <i className="fa-solid fa-key" aria-hidden="true" /> Cambiar contraseña
            </button>
            {passAviso && (
              <span role="status" className="text-sm font-medium text-primary">
                {passAviso}
              </span>
            )}
            {passError && (
              <span role="alert" className="text-sm font-medium text-danger">
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {passError}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Sesión */}
      <section className="surface-section" aria-labelledby="sesion-titulo">
        <h2 id="sesion-titulo">
          <i className="fa-solid fa-right-from-bracket text-primary" aria-hidden="true" /> Sesión
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sesión activa con JWT de 7 días. Al cerrarla en este dispositivo, tus recetas siguen
          guardadas en tu cuenta.
        </p>
        <button
          type="button"
          className="btn-ghost mt-3 !text-danger"
          onClick={() => {
            logout();
            navigate('/', { replace: true });
          }}
        >
          <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> Cerrar sesión
        </button>
      </section>

      {/* Zona de peligro — eliminación de cuenta con código al correo (Fase 7) */}
      <section className="surface-section" aria-labelledby="peligro-titulo">
        <h2 id="peligro-titulo">
          <i className="fa-solid fa-triangle-exclamation text-danger" aria-hidden="true" /> Zona de
          peligro
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Eliminar tu cuenta borra <strong>definitivamente</strong> tus recetas, favoritos,
          historial de búsquedas y preferencias. Por tu seguridad te enviaremos un código de 6
          dígitos a <strong>{usuario.correo}</strong> para confirmar.
        </p>
        <button type="button" className="btn-ghost mt-3 !text-danger" onClick={eliminarCuenta}>
          <i className="fa-solid fa-user-slash" aria-hidden="true" /> Eliminar mi cuenta
        </button>
      </section>
    </div>
  );
}
