import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Modal from '../ui/Modal.jsx';

/**
 * Onboarding guiado — Fase 6 (RF-25 / CU-25, CU-47, CU-48).
 *
 * - Tour de 6 pasos con objetivo resaltado (anillo spotlight) sobre el
 *   elemento real de la interfaz (`[data-tour="…"]`).
 * - «Paso X de 6» (progreso), «Omitir» siempre visible, Atrás/Siguiente.
 * - Se muestra una sola vez por usuario (localStorage `sazonlab-onboarding`),
 *   al entrar en Inicio; «Repetir tour» desde Ajustes lo relanza.
 * - Funciona para invitado, usuario registrado y administrador (CU-25).
 */
const CLAVE = 'sazonlab-onboarding';

const PASOS = [
  {
    id: 'bienvenida',
    icono: 'fa-hand-sparkles',
    titulo: '¡Bienvenido a SazónLab!',
    texto:
      'Tu recetario inteligente con recetas en español, 12 temas y exportación a PDF. Te enseñamos lo esencial en menos de un minuto.',
  },
  {
    id: 'buscador',
    objetivo: 'buscador',
    icono: 'fa-magnifying-glass',
    titulo: 'Busca lo que tengas en casa',
    texto:
      'Desde el buscador de la cabecera encuentras recetas por nombre, por ingredientes o por etiquetas, estés donde estés.',
  },
  {
    id: 'tema',
    objetivo: 'tema',
    icono: 'fa-palette',
    titulo: 'Tu estilo, a tu manera',
    texto:
      '12 temas con modos claro, oscuro y alto contraste. Todo con la estética Liquid Glass, aplicado al instante.',
  },
  {
    id: 'notificaciones',
    objetivo: 'notificaciones',
    icono: 'fa-bell',
    titulo: 'Notificaciones al día',
    texto:
      'La campana recoge tus avisos: recetas guardadas, favoritos, exportaciones… Sin perderte nada.',
  },
  {
    id: 'crear',
    objetivo: 'crear',
    icono: 'fa-utensils',
    titulo: 'Crea tu propio recetario',
    texto:
      'Añade recetas con ingredientes y pasos, márcalas como favoritas y genera tu libro de cocina en PDF con índice y página de medidas.',
  },
  {
    id: 'listo',
    icono: 'fa-circle-check',
    titulo: '¡Listo para cocinar!',
    texto: 'Puedes repetir este tour cuando quieras desde Ajustes → Accesibilidad. ¡Que disfrutes!',
  },
];

/** Rectángulo (fixed) de un elemento, con un pequeño margen. */
function rectDe(elemento) {
  const r = elemento.getBoundingClientRect();
  const margen = 8;
  return {
    top: Math.max(0, r.top - margen),
    left: Math.max(0, r.left - margen),
    width: Math.min(window.innerWidth, r.width + margen * 2),
    height: Math.min(window.innerHeight - Math.max(0, r.top - margen), r.height + margen * 2),
  };
}

export default function Onboarding() {
  const location = useLocation();
  const [paso, setPaso] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [rect, setRect] = useState(null);

  const cerrar = useCallback(() => {
    setAbierto(false);
    setRect(null);
    try {
      localStorage.setItem(CLAVE, 'visto');
    } catch {
      /* almacenamiento no disponible: se reintentará en la próxima visita */
    }
  }, []);

  // Apertura automática: primera visita, en Inicio, con retardo para que
  // la cabecera y el menú ya estén renderizados.
  useEffect(() => {
    if (location.pathname !== '/') return;
    let visto = null;
    try {
      visto = localStorage.getItem(CLAVE);
    } catch {
      visto = 'visto'; // sin storage: no molestar
    }
    if (visto) return;
    const t = setTimeout(() => {
      setPaso(0);
      setAbierto(true);
    }, 600);
    return () => clearTimeout(t);
  }, [location.pathname]);

  // «Repetir tour» desde Ajustes (evento personalizado)
  useEffect(() => {
    const lanzar = () => {
      setPaso(0);
      setAbierto(true);
    };
    window.addEventListener('sazonlab:tour', lanzar);
    return () => window.removeEventListener('sazonlab:tour', lanzar);
  }, []);

  // Rectángulo del objetivo: al cambiar de paso, al girar/redimensionar y
  // al desplazarse (el anillo sigue al elemento).
  useEffect(() => {
    if (!abierto) return;
    const calcular = () => {
      const el = PASOS[paso]?.objetivo
        ? document.querySelector(`[data-tour="${PASOS[paso].objetivo}"]`)
        : null;
      setRect(el ? rectDe(el) : null);
      if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    };
    calcular();
    const t = setTimeout(calcular, 120); // tras el scrollIntoView
    window.addEventListener('resize', calcular);
    window.addEventListener('scroll', calcular, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', calcular);
      window.removeEventListener('scroll', calcular, true);
    };
  }, [abierto, paso]);

  if (!abierto) return null;

  const p = PASOS[paso];
  const esUltimo = paso === PASOS.length - 1;

  return (
    <>
      {/* Anillo spotlight: oscurece todo menos el elemento objetivo */}
      {rect && (
        <div
          className="pointer-events-none fixed z-[64] rounded-2xl transition-all duration-200"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: '0 0 0 9999px rgb(2 18 32 / 0.68)',
          }}
          aria-hidden="true"
        />
      )}

      <Modal
        open={abierto}
        onClose={cerrar}
        labelledBy="onboarding-titulo"
        backdropClass="bg-transparent"
        cerrarConFondo={false}
        className={rect ? 'relative z-[66] max-w-md' : 'max-w-md'}
      >
        <div className="text-center">
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-2xl text-primary"
            aria-hidden="true"
          >
            <i className={`fa-solid ${p.icono}`} />
          </span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <i className="fa-solid fa-route" aria-hidden="true" /> Paso {paso + 1} de {PASOS.length}
          </p>
          <h2 id="onboarding-titulo" className="mt-1">
            {p.titulo}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.texto}</p>

          {/* Progreso (CU-47) */}
          <ol className="mt-4 flex justify-center gap-1.5" aria-label="Progreso del tour">
            {PASOS.map((item, i) => (
              <li
                key={item.id}
                className={`h-2 w-2 rounded-full ${i === paso ? 'bg-primary' : 'bg-muted'}`}
                aria-current={i === paso ? 'step' : undefined}
              >
                <span className="sr-only">Paso {i + 1}</span>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-between">
            {/* Omitir (CU-48) siempre visible */}
            <button type="button" className="btn-ghost" onClick={cerrar}>
              Omitir tour
            </button>
            <div className="flex gap-2">
              {paso > 0 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPaso((n) => n - 1)}
                >
                  <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Atrás
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={() => (esUltimo ? cerrar() : setPaso((n) => n + 1))}
              >
                {esUltimo ? (
                  <>
                    <i className="fa-solid fa-check" aria-hidden="true" /> ¡Empezar!
                  </>
                ) : (
                  <>
                    Siguiente <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
