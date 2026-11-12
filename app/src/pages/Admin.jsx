import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api, ApiError } from '../services/api.js';
import { exito, fracaso } from '../services/toast.js';
import { useAuthStore } from '../store/authStore.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Panel de administración (RF-22 + RF-02 — Fase 9):
 * crear cuentas con rol elegido, cambiar roles e inactivar/activar
 * usuarios. Solo visible para el rol 'admin'; las confirmaciones
 * críticas usan SweetAlert2 y el resto son toasts propios.
 */
export default function Admin() {
  const usuario = useAuthStore((s) => s.usuario);
  const [usuarios, setUsuarios] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nombre: '', correo: '', contrasena: '', rol: 'usuario' });
  const [formError, setFormError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const esAdmin = usuario?.rol === 'admin';

  function cargar() {
    api
      .get('/admin/usuarios')
      .then((datos) => setUsuarios(datos.usuarios))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el listado');
        setUsuarios([]);
      });
  }

  useEffect(() => {
    if (esAdmin) cargar();
  }, [esAdmin]);

  if (!usuario) {
    return (
      <div className="glass-card flex flex-col items-center gap-3 py-10 text-center">
        <i className="fa-solid fa-lock text-4xl text-primary" aria-hidden="true" />
        <p className="font-medium">Inicia sesión para acceder</p>
        <Link to="/login" className="btn-primary mt-1">
          <i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Iniciar sesión
        </Link>
      </div>
    );
  }

  if (!esAdmin) {
    return (
      <div className="glass-card flex flex-col items-center gap-3 py-10 text-center">
        <i className="fa-solid fa-user-shield text-4xl text-primary" aria-hidden="true" />
        <p className="font-medium">Esta sección es solo para administradores</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Tu cuenta no tiene el rol <strong>admin</strong>. Si necesitas acceso, pídeselo al
          administrador del sistema.
        </p>
        <Link to="/" className="btn-ghost mt-1 !px-3">
          <i className="fa-solid fa-house" aria-hidden="true" /> Volver al inicio
        </Link>
      </div>
    );
  }

  async function crearUsuario(ev) {
    ev.preventDefault();
    setFormError('');

    if (form.nombre.trim().length < 2) {
      setFormError('El nombre debe tener al menos 2 caracteres');
      return;
    }
    if (!EMAIL_RE.test(form.correo.trim())) {
      setFormError('Correo electrónico inválido');
      return;
    }
    if (form.contrasena.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    const confirmar = await Swal.fire({
      icon: 'question',
      title: '¿Crear esta cuenta?',
      html: `Se creará <strong>${form.nombre.trim()}</strong> (${form.correo.trim().toLowerCase()}) con el rol <strong>${form.rol}</strong>.`,
      showCancelButton: true,
      confirmButtonText: 'Crear cuenta',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmar.isConfirmed) return;

    setGuardando(true);
    try {
      await api.post('/admin/usuarios', {
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        contrasena: form.contrasena,
        rol: form.rol,
      });
      exito('Cuenta creada correctamente');
      setForm({ nombre: '', correo: '', contrasena: '', rol: 'usuario' });
      cargar();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo crear la cuenta';
      setFormError(msg);
      fracaso(msg);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarRol(u, nuevoRol) {
    if (nuevoRol === u.rol) return;
    const confirmar = await Swal.fire({
      icon: 'warning',
      title:
        nuevoRol === 'admin' ? '¿Promover a administrador?' : '¿Quitar el rol de administrador?',
      html: `<strong>${u.nombre}</strong> pasará a tener el rol <strong>${nuevoRol}</strong>.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar rol',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: nuevoRol === 'admin' ? '#0ea5e9' : '#dc2626',
    });
    if (!confirmar.isConfirmed) {
      cargar(); // revierte el select visual
      return;
    }
    try {
      await api.patch(`/admin/usuarios/${u.id}`, { rol: nuevoRol });
      exito(`Rol actualizado: ${u.nombre} ahora es ${nuevoRol}`);
      cargar();
    } catch (err) {
      fracaso(err instanceof ApiError ? err.message : 'No se pudo cambiar el rol');
      cargar();
    }
  }

  async function cambiarEstado(u) {
    const activar = u.estado === 'inactivo';
    const confirmar = await Swal.fire({
      icon: activar ? 'question' : 'warning',
      title: activar ? '¿Reactivar la cuenta?' : '¿Inactivar la cuenta?',
      html: activar
        ? `<strong>${u.nombre}</strong> volverá a poder iniciar sesión.`
        : `<strong>${u.nombre}</strong> perderá el acceso de inmediato: se cerrará su sesión y no podrá iniciar sesión hasta que la reactives.`,
      showCancelButton: true,
      confirmButtonText: activar ? 'Reactivar' : 'Inactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: activar ? '#0ea5e9' : '#dc2626',
    });
    if (!confirmar.isConfirmed) return;
    try {
      await api.patch(`/admin/usuarios/${u.id}`, {
        estado: activar ? 'activo' : 'inactivo',
      });
      exito(activar ? 'Cuenta reactivada' : 'Cuenta inactivada');
      cargar();
    } catch (err) {
      fracaso(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1>
          <i className="fa-solid fa-user-shield text-primary" aria-hidden="true" /> Administración
        </h1>
        <p className="mt-1 text-muted-foreground">
          Crea cuentas, asigna roles e inactiva usuarios (RF-22). Todo queda en la auditoría del
          sistema.
        </p>
      </header>

      {error && (
        <p role="alert" className="glass-card text-sm font-medium text-danger">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      {/* Crear cuenta */}
      <section className="glass-card" aria-labelledby="crear-usuario-titulo">
        <h2 id="crear-usuario-titulo" className="text-base">
          <i className="fa-solid fa-user-plus text-primary" aria-hidden="true" /> Crear usuario
        </h2>
        <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={crearUsuario} noValidate>
          <label className="flex flex-col gap-1 text-sm">
            Nombre
            <input
              type="text"
              className="field"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              autoComplete="off"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Correo electrónico
            <input
              type="email"
              className="field"
              value={form.correo}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
              autoComplete="off"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Contraseña (mín. 8 caracteres)
            <input
              type="password"
              className="field"
              value={form.contrasena}
              onChange={(e) => setForm({ ...form, contrasena: e.target.value })}
              autoComplete="new-password"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Rol
            <select
              className="field"
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value })}
            >
              <option value="usuario">Usuario registrado</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          {formError && (
            <p role="alert" className="sm:col-span-2 text-sm font-medium text-danger">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {formError}
            </p>
          )}
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary !px-4 !text-sm" disabled={guardando}>
              <i
                className={`fa-solid ${guardando ? 'fa-spinner fa-spin' : 'fa-user-plus'}`}
                aria-hidden="true"
              />
              {guardando ? ' Creando…' : ' Crear cuenta'}
            </button>
          </div>
        </form>
      </section>

      {/* Listado */}
      <section className="glass-card" aria-labelledby="usuarios-titulo">
        <h2 id="usuarios-titulo" className="text-base">
          <i className="fa-solid fa-users text-primary" aria-hidden="true" /> Usuarios registrados
          {usuarios && <span className="text-muted-foreground"> ({usuarios.length})</span>}
        </h2>

        {usuarios === null && (
          <p className="mt-3 text-sm text-muted-foreground" role="status">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando usuarios…
          </p>
        )}

        {usuarios?.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Listado de cuentas con rol, estado y acciones</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Usuario
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Rol
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Estado
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Recetas
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const propia = u.id === usuario.id;
                  return (
                    <tr key={u.id} className="border-b border-border/40 last:border-0">
                      <td className="py-2 pr-4">
                        <span className="font-medium">{u.nombre}</span>
                        {propia && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
                        <br />
                        <span className="text-xs text-muted-foreground">{u.correo}</span>
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            u.rol === 'admin'
                              ? 'bg-primary/15 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {u.rol === 'admin' ? 'Administrador' : 'Usuario'}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            u.estado === 'activo'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-danger/15 text-danger'
                          }`}
                        >
                          {u.estado === 'activo' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{u.recetas}</td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="sr-only" htmlFor={`rol-${u.id}`}>
                            Cambiar rol de {u.nombre}
                          </label>
                          <select
                            id={`rol-${u.id}`}
                            className="field !w-auto !py-1 text-xs"
                            value={u.rol}
                            disabled={propia}
                            onChange={(e) => cambiarRol(u, e.target.value)}
                          >
                            <option value="usuario">Usuario</option>
                            <option value="admin">Administrador</option>
                          </select>
                          <button
                            type="button"
                            className={`btn-ghost !px-3 !text-xs ${
                              u.estado === 'activo' ? 'text-danger' : ''
                            }`}
                            disabled={propia}
                            onClick={() => cambiarEstado(u)}
                          >
                            <i
                              className={`fa-solid ${
                                u.estado === 'activo' ? 'fa-user-slash' : 'fa-user-check'
                              }`}
                              aria-hidden="true"
                            />
                            {u.estado === 'activo' ? ' Inactivar' : ' Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {usuarios?.length === 0 && !error && (
          <p className="mt-3 text-sm text-muted-foreground">No hay usuarios registrados aún.</p>
        )}
      </section>
    </div>
  );
}
