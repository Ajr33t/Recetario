import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api, ApiError } from '../services/api.js';
import { exito, fracaso } from '../services/toast.js';
import { useAuthStore } from '../store/authStore.js';
import { usePedidosStore } from '../store/pedidosStore.js';
import Modal from '../components/ui/Modal.jsx';

/** Estados posibles y su apariencia (deben coincidir con el CHECK de la BD). */
const ESTADOS = {
  pendiente: {
    etiqueta: 'Pendiente',
    clase: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    icono: 'fa-clock',
  },
  completado: {
    etiqueta: 'Completado',
    clase: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    icono: 'fa-circle-check',
  },
  cancelado: {
    etiqueta: 'Cancelado',
    clase: 'bg-muted text-muted-foreground',
    icono: 'fa-ban',
  },
};

const METODOS_PAGO = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'otro', etiqueta: 'Otro' },
];

/** Fecha de SQLite (UTC) → texto local legible. */
function formatearFecha(sql) {
  if (!sql) return '—';
  const fecha = new Date(String(sql).replace(' ', 'T') + (String(sql).includes('Z') ? '' : 'Z'));
  return Number.isNaN(fecha.getTime())
    ? String(sql)
    : fecha.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Importe sin símbolo de moneda (la app no define divisa). */
function formatearImporte(valor) {
  return Number(valor || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Lista de pedidos (punto 1 del encargo):
 * crear, editar, marcar como completado y eliminar, con filtros por estado
 * y rango de fechas, contador de activos y estados de carga/error/vacío.
 * El administrador ve todos los pedidos; el resto, los suyos (lo decide la API).
 */
export default function Pedidos() {
  const usuario = useAuthStore((s) => s.usuario);
  const refetchContador = usePedidosStore((s) => s.refetch);

  const [pedidos, setPedidos] = useState(null); // null = cargando
  const [contador, setContador] = useState(null);
  const [error, setError] = useState('');

  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  // Modal: null | { modo: 'nuevo' | 'editar' | 'detalle', pedido?, detalle? }
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ total: '', metodo_pago: 'efectivo', notas: '' });
  const [seleccion, setSeleccion] = useState({}); // { receta_id: cantidad }
  const [recetasDisponibles, setRecetasDisponibles] = useState(null);
  const [busquedaReceta, setBusquedaReceta] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  /** Refresca el contador (tarjetas + badge del sidebar). */
  async function refetchContadorLocal() {
    try {
      const datos = await api.get('/pedidos/contador');
      setContador(datos);
    } catch {
      /* el contador es decorativo: si falla, no se bloquea la página */
    }
    refetchContador();
  }

  /** Carga la lista con los filtros activos. */
  async function cargar() {
    const params = new URLSearchParams();
    if (filtroEstado) params.set('estado', filtroEstado);
    if (filtroDesde) params.set('fecha_desde', filtroDesde);
    if (filtroHasta) params.set('fecha_hasta', filtroHasta);
    const qs = params.toString();

    try {
      const datos = await api.get(`/pedidos${qs ? `?${qs}` : ''}`);
      setPedidos(datos.pedidos);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los pedidos');
      setPedidos([]);
    }
  }

  useEffect(() => {
    if (!usuario) {
      setPedidos([]);
      return;
    }
    cargar();
    refetchContadorLocal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, filtroEstado, filtroDesde, filtroHasta]);

  const hayFiltros = Boolean(filtroEstado || filtroDesde || filtroHasta);
  function limpiarFiltros() {
    setFiltroEstado('');
    setFiltroDesde('');
    setFiltroHasta('');
  }

  /** Abre el modal de nuevo pedido y carga las recetas para elegir. */
  async function abrirNuevo() {
    setForm({ total: '', metodo_pago: 'efectivo', notas: '' });
    setSeleccion({});
    setBusquedaReceta('');
    setErrorForm('');
    setModal({ modo: 'nuevo' });
    if (recetasDisponibles === null) {
      try {
        const datos = await api.get('/recipes');
        setRecetasDisponibles(datos.recetas || []);
      } catch {
        setRecetasDisponibles([]);
      }
    }
  }

  /** Abre el modal de edición (total, método de pago y notas). */
  function abrirEditar(pedido) {
    setForm({
      total: String(pedido.total),
      metodo_pago: pedido.metodo_pago || 'efectivo',
      notas: pedido.notas || '',
    });
    setErrorForm('');
    setModal({ modo: 'editar', pedido });
  }

  /** Abre el detalle del pedido con sus recetas. */
  async function abrirDetalle(pedido) {
    setModal({ modo: 'detalle', pedido, detalle: null });
    try {
      const datos = await api.get(`/pedidos/${pedido.id}`);
      setModal({ modo: 'detalle', pedido, detalle: datos });
    } catch (err) {
      fracaso(err instanceof ApiError ? err.message : 'No se pudo cargar el pedido');
      setModal(null);
    }
  }

  /** Guarda el pedido (alta o edición) según el modo del modal. */
  async function guardar() {
    const total = Number(String(form.total).replace(',', '.'));
    if (!Number.isFinite(total) || total < 0) {
      setErrorForm('Indica un total válido (número mayor o igual a 0).');
      return;
    }

    if (modal.modo === 'nuevo') {
      const recetas = Object.entries(seleccion)
        .filter(([, cantidad]) => Number(cantidad) > 0)
        .map(([receta_id, cantidad]) => ({ receta_id: Number(receta_id), cantidad: Number(cantidad) }));
      if (recetas.length === 0) {
        setErrorForm('Selecciona al menos una receta para el pedido.');
        return;
      }
      setGuardando(true);
      try {
        await api.post('/pedidos', {
          total,
          metodo_pago: form.metodo_pago,
          notas: form.notas.trim() || null,
          recetas,
        });
        exito('Pedido creado');
        setModal(null);
        await cargar();
        refetchContadorLocal();
      } catch (err) {
        setErrorForm(err instanceof ApiError ? err.message : 'No se pudo crear el pedido');
      } finally {
        setGuardando(false);
      }
      return;
    }

    // Edición
    setGuardando(true);
    try {
      await api.put(`/pedidos/${modal.pedido.id}`, {
        total,
        metodo_pago: form.metodo_pago,
        notas: form.notas.trim() || null,
      });
      exito('Pedido actualizado');
      setModal(null);
      await cargar();
      refetchContadorLocal();
    } catch (err) {
      setErrorForm(err instanceof ApiError ? err.message : 'No se pudo editar el pedido');
    } finally {
      setGuardando(false);
    }
  }

  /** Marca un pedido como completado (con confirmación). */
  async function completar(pedido) {
    const confirmar = await Swal.fire({
      title: `¿Completar el pedido #${pedido.id}?`,
      text: 'Se marcará como completado y contará como resuelto.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, completar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0ea5e9',
    });
    if (!confirmar.isConfirmed) return;

    try {
      await api.put(`/pedidos/${pedido.id}/completar`);
      exito(`Pedido #${pedido.id} completado`);
      await cargar();
      refetchContadorLocal();
    } catch (err) {
      fracaso(err instanceof ApiError ? err.message : 'No se pudo completar el pedido');
    }
  }

  /** Elimina un pedido (con confirmación destructiva). */
  async function eliminar(pedido) {
    const confirmar = await Swal.fire({
      title: `¿Eliminar el pedido #${pedido.id}?`,
      text: 'Se borrará definitivamente junto con sus recetas asociadas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!confirmar.isConfirmed) return;

    try {
      await api.delete(`/pedidos/${pedido.id}`);
      exito(`Pedido #${pedido.id} eliminado`);
      await cargar();
      refetchContadorLocal();
    } catch (err) {
      fracaso(err instanceof ApiError ? err.message : 'No se pudo eliminar el pedido');
    }
  }

  /** Alterna la selección de una receta en el alta (cantidad por defecto 1). */
  function alternarReceta(recetaId) {
    setSeleccion((prev) => {
      const copia = { ...prev };
      if (copia[recetaId]) delete copia[recetaId];
      else copia[recetaId] = 1;
      return copia;
    });
  }

  if (!usuario) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1>Pedidos</h1>
          <p className="mt-1 text-muted-foreground">
            Crea y da seguimiento a tus pedidos desde un solo lugar.
          </p>
        </header>
        <div className="glass-card flex flex-col items-center gap-3 py-10 text-center">
          <i className="fa-solid fa-lock text-4xl text-primary" aria-hidden="true" />
          <p className="font-medium">Inicia sesión para ver los pedidos</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Los pedidos se guardan en tu cuenta: al iniciar sesión los ves desde cualquier
            dispositivo.
          </p>
          <Link to="/login" className="btn-primary mt-1">
            <i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  // Reservado al rol chef/restaurante: ni admin ni usuario normal acceden.
  if (usuario.rol !== 'chef') {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1>Pedidos</h1>
          <p className="mt-1 text-muted-foreground">
            Gestión de pedidos del restaurante.
          </p>
        </header>
        <div className="glass-card flex flex-col items-center gap-3 py-10 text-center">
          <i className="fa-solid fa-user-slash text-4xl text-primary" aria-hidden="true" />
          <p className="font-medium">Esta sección es solo para cuentas Chef/Restaurante</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Tu cuenta no tiene el perfil de chef. Si necesitas acceso, pídeselo al
            administrador para que cambie tu tipo de cuenta.
          </p>
          <Link to="/" className="btn-secondary mt-1">
            <i className="fa-solid fa-house" aria-hidden="true" /> Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const recetasFiltradas = (recetasDisponibles || []).filter((r) =>
    r.titulo.toLowerCase().includes(busquedaReceta.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Lista de pedidos</h1>
          <p className="mt-1 text-muted-foreground">
            Tus pedidos: crea, edita, completa y elimina.
          </p>
        </div>
        <button type="button" className="btn-primary !px-3" onClick={abrirNuevo}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> Nuevo pedido
        </button>
      </header>

      {/* Contador de pedidos activos (visible siempre) */}
      <section aria-label="Resumen de pedidos" className="grid gap-3 sm:grid-cols-3">
        <div className="glass-card flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-lg text-amber-600 dark:text-amber-400" aria-hidden="true">
            <i className="fa-solid fa-clock" />
          </span>
          <div>
            <p className="text-2xl font-semibold leading-none">{contador?.activos ?? '—'}</p>
            <p className="text-sm text-muted-foreground">Pedidos activos</p>
          </div>
        </div>
        <div className="glass-card flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-lg text-emerald-600 dark:text-emerald-400" aria-hidden="true">
            <i className="fa-solid fa-circle-check" />
          </span>
          <div>
            <p className="text-2xl font-semibold leading-none">{contador?.completado ?? '—'}</p>
            <p className="text-sm text-muted-foreground">Completados</p>
          </div>
        </div>
        <div className="glass-card flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-lg text-primary" aria-hidden="true">
            <i className="fa-solid fa-receipt" />
          </span>
          <div>
            <p className="text-2xl font-semibold leading-none">{contador?.total ?? '—'}</p>
            <p className="text-sm text-muted-foreground">Total de pedidos</p>
          </div>
        </div>
      </section>

      {/* Filtros siempre visibles: estado y rango de fechas */}
      <section className="surface-section" aria-labelledby="filtros-pedidos-titulo" role="group">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="filtros-pedidos-titulo" className="text-base">
            <i className="fa-solid fa-filter text-primary" aria-hidden="true" /> Filtrar pedidos
          </h2>
          {hayFiltros && (
            <button type="button" className="btn-ghost !px-3 !text-xs" onClick={limpiarFiltros}>
              <i className="fa-solid fa-xmark" aria-hidden="true" /> Limpiar filtros
            </button>
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Estado
            <select
              className="field"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="completado">Completados</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Desde
            <input
              type="date"
              className="field"
              value={filtroDesde}
              onChange={(e) => setFiltroDesde(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Hasta
            <input
              type="date"
              className="field"
              value={filtroHasta}
              onChange={(e) => setFiltroHasta(e.target.value)}
            />
          </label>
        </div>
      </section>

      {error && (
        <p role="alert" className="glass-card text-sm font-medium text-danger">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      {pedidos === null && (
        <p className="text-sm text-muted-foreground" role="status">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando pedidos…
        </p>
      )}

      {pedidos?.length === 0 && !error && (
        <div className="glass-card flex flex-col items-center gap-2 py-10 text-center">
          <i className="fa-solid fa-receipt text-4xl text-primary" aria-hidden="true" />
          <p className="font-medium">
            {hayFiltros ? 'Ningún pedido pasa los filtros' : 'Aún no hay pedidos'}
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            {hayFiltros
              ? 'Ajusta o limpia los filtros para ver el resto de pedidos.'
              : 'Crea tu primer pedido eligiendo recetas, total y método de pago.'}
          </p>
          {hayFiltros ? (
            <button type="button" className="btn-secondary mt-1 !px-3" onClick={limpiarFiltros}>
              <i className="fa-solid fa-xmark" aria-hidden="true" /> Limpiar filtros
            </button>
          ) : (
            <button type="button" className="btn-primary mt-1" onClick={abrirNuevo}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> Crear el primer pedido
            </button>
          )}
        </div>
      )}

      {pedidos?.length > 0 && (
        <ul className="flex flex-col gap-3" role="list">
          {pedidos.map((pedido) => {
            const estado = ESTADOS[pedido.estado] || ESTADOS.pendiente;
            return (
              <li key={pedido.id} className="glass-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">Pedido #{pedido.id}</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.clase}`}>
                      <i className={`fa-solid ${estado.icono}`} aria-hidden="true" /> {estado.etiqueta}
                    </span>
                    <span className="chip">
                      <i className="fa-solid fa-utensils" aria-hidden="true" /> {pedido.items} receta(s)
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <i className="fa-solid fa-calendar" aria-hidden="true" />{' '}
                    {formatearFecha(pedido.creado_en)}
                    {pedido.usuario_nombre && (
                      <>
                        {' · '}
                        <i className="fa-solid fa-user" aria-hidden="true" /> {pedido.usuario_nombre}
                      </>
                    )}
                  </p>
                  {pedido.notas && (
                    <p className="truncate text-sm text-muted-foreground">
                      <i className="fa-solid fa-note-sticky" aria-hidden="true" /> {pedido.notas}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="mr-1 text-lg font-semibold">
                    {formatearImporte(pedido.total)}
                  </span>
                  <button type="button" className="btn-ghost !px-3 !text-xs" onClick={() => abrirDetalle(pedido)}>
                    <i className="fa-solid fa-eye" aria-hidden="true" /> Ver
                  </button>
                  <button type="button" className="btn-ghost !px-3 !text-xs" onClick={() => abrirEditar(pedido)}>
                    <i className="fa-solid fa-pen" aria-hidden="true" /> Editar
                  </button>
                  {pedido.estado !== 'completado' && (
                    <button type="button" className="btn-secondary !px-3 !text-xs" onClick={() => completar(pedido)}>
                      <i className="fa-solid fa-check" aria-hidden="true" /> Completar
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-ghost !px-3 !text-xs text-danger"
                    onClick={() => eliminar(pedido)}
                    aria-label={`Eliminar pedido ${pedido.id}`}
                  >
                    <i className="fa-solid fa-trash-can" aria-hidden="true" /> Eliminar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ===== Modal: nuevo pedido ===== */}
      <Modal
        open={modal?.modo === 'nuevo'}
        onClose={() => setModal(null)}
        labelledBy="titulo-nuevo-pedido"
        className="max-w-lg"
      >
        <h2 id="titulo-nuevo-pedido" className="text-lg font-semibold">
          <i className="fa-solid fa-receipt text-primary" aria-hidden="true" /> Nuevo pedido
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Elige las recetas, indica el total y el método de pago.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Recetas del pedido *
            <input
              type="search"
              className="field"
              placeholder="Buscar receta…"
              value={busquedaReceta}
              onChange={(e) => setBusquedaReceta(e.target.value)}
            />
          </label>

          <ul className="max-h-52 flex flex-col gap-2 overflow-y-auto rounded-xl border border-border p-2" role="list">
            {recetasDisponibles === null && (
              <li className="px-2 py-1 text-sm text-muted-foreground" role="status">
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando recetas…
              </li>
            )}
            {recetasDisponibles?.length === 0 && (
              <li className="px-2 py-1 text-sm text-muted-foreground">
                No hay recetas disponibles.{' '}
                <Link to="/recetas/nueva" className="text-primary underline">
                  Crea una
                </Link>
                .
              </li>
            )}
            {recetasFiltradas.map((receta) => {
              const elegida = Boolean(seleccion[receta.id]);
              return (
                <li key={receta.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
                  <input
                    type="checkbox"
                    id={`receta-${receta.id}`}
                    checked={elegida}
                    onChange={() => alternarReceta(receta.id)}
                  />
                  <label htmlFor={`receta-${receta.id}`} className="min-w-0 flex-1 cursor-pointer truncate text-sm">
                    {receta.titulo}
                  </label>
                  {elegida && (
                    <input
                      type="number"
                      min="1"
                      step="1"
                      aria-label={`Cantidad de ${receta.titulo}`}
                      className="field !w-20 !py-1"
                      value={seleccion[receta.id]}
                      onChange={(e) =>
                        setSeleccion((prev) => ({ ...prev, [receta.id]: Math.max(1, Number(e.target.value) || 1) }))
                      }
                    />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Total *
              <input
                type="number"
                min="0"
                step="0.01"
                className="field"
                value={form.total}
                onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
                placeholder="0.00"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Método de pago
              <select
                className="field"
                value={form.metodo_pago}
                onChange={(e) => setForm((f) => ({ ...f, metodo_pago: e.target.value }))}
              >
                {METODOS_PAGO.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.etiqueta}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Notas
            <textarea
              className="field min-h-20"
              value={form.notas}
              onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              placeholder="Indicaciones del pedido (opcional)"
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
                  <i className="fa-solid fa-check" aria-hidden="true" /> Crear pedido
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ===== Modal: editar pedido ===== */}
      <Modal
        open={modal?.modo === 'editar'}
        onClose={() => setModal(null)}
        labelledBy="titulo-editar-pedido"
        className="max-w-md"
      >
        <h2 id="titulo-editar-pedido" className="text-lg font-semibold">
          <i className="fa-solid fa-pen text-primary" aria-hidden="true" /> Editar pedido #
          {modal?.pedido?.id}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Modifica el total, el método de pago o las notas.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Total *
              <input
                type="number"
                min="0"
                step="0.01"
                className="field"
                value={form.total}
                onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Método de pago
              <select
                className="field"
                value={form.metodo_pago}
                onChange={(e) => setForm((f) => ({ ...f, metodo_pago: e.target.value }))}
              >
                {METODOS_PAGO.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.etiqueta}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Notas
            <textarea
              className="field min-h-20"
              value={form.notas}
              onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
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
                  <i className="fa-solid fa-check" aria-hidden="true" /> Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ===== Modal: detalle del pedido ===== */}
      <Modal
        open={modal?.modo === 'detalle'}
        onClose={() => setModal(null)}
        labelledBy="titulo-detalle-pedido"
        className="max-w-md"
      >
        <h2 id="titulo-detalle-pedido" className="text-lg font-semibold">
          <i className="fa-solid fa-receipt text-primary" aria-hidden="true" /> Pedido #
          {modal?.pedido?.id}
        </h2>

        {!modal?.detalle ? (
          <p className="mt-4 text-sm text-muted-foreground" role="status">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando detalle…
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${(ESTADOS[modal.detalle.pedido.estado] || ESTADOS.pendiente).clase}`}>
                <i
                  className={`fa-solid ${(ESTADOS[modal.detalle.pedido.estado] || ESTADOS.pendiente).icono}`}
                  aria-hidden="true"
                />{' '}
                {(ESTADOS[modal.detalle.pedido.estado] || ESTADOS.pendiente).etiqueta}
              </span>
              <span className="chip">
                <i className="fa-solid fa-credit-card" aria-hidden="true" />{' '}
                {METODOS_PAGO.find((m) => m.valor === modal.detalle.pedido.metodo_pago)?.etiqueta ||
                  modal.detalle.pedido.metodo_pago}
              </span>
              <span className="chip">{formatearImporte(modal.detalle.pedido.total)}</span>
            </div>

            <p className="text-sm text-muted-foreground">
              <i className="fa-solid fa-calendar" aria-hidden="true" />{' '}
              {formatearFecha(modal.detalle.pedido.creado_en)}
              {modal.detalle.pedido.usuario_nombre && (
                <>
                  {' · '}
                  <i className="fa-solid fa-user" aria-hidden="true" />{' '}
                  {modal.detalle.pedido.usuario_nombre}
                </>
              )}
            </p>

            {modal.detalle.pedido.notas && (
              <p className="text-sm text-muted-foreground">
                <i className="fa-solid fa-note-sticky" aria-hidden="true" /> {modal.detalle.pedido.notas}
              </p>
            )}

            <div>
              <h3 className="text-sm font-semibold">Recetas incluidas</h3>
              <ul className="mt-2 flex flex-col gap-1.5" role="list">
                {modal.detalle.recetas.length === 0 && (
                  <li className="text-sm text-muted-foreground">Sin recetas asociadas.</li>
                )}
                {modal.detalle.recetas.map((r) => (
                  <li key={r.receta_id} className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                    <Link to={`/receta/${r.receta_id}`} className="truncate hover:text-primary" onClick={() => setModal(null)}>
                      {r.titulo || `Receta #${r.receta_id}`}
                    </Link>
                    <span className="shrink-0 text-muted-foreground">×{r.cantidad}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end">
              <button type="button" className="btn-ghost !px-3" onClick={() => setModal(null)}>
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
