import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { exito } from '../../services/toast.js';
import { descargarImagenReceta, imprimirReceta } from '../../services/exportarReceta.js';

/**
 * Menú desplegable de descargas (punto 2 del encargo): PDF e imagen para
 * cualquier receta (propia, de IA/importada o pública). Accesible: botón con
 * aria-expanded, menú con roles, cierre con Escape/clic fuera y foco visible.
 */
export default function MenuDescargas({ receta }) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);
  const boton = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const alClicFuera = (e) => {
      if (!contenedor.current?.contains(e.target)) setAbierto(false);
    };
    const alTecla = (e) => {
      if (e.key === 'Escape') {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    document.addEventListener('pointerdown', alClicFuera);
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('pointerdown', alClicFuera);
      document.removeEventListener('keydown', alTecla);
    };
  }, [abierto]);

  async function imagen() {
    setAbierto(false);
    try {
      await descargarImagenReceta(receta);
      exito('Imagen PNG descargada');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo generar la imagen', text: err.message || 'Reintenta.' });
    }
  }

  async function pdf() {
    setAbierto(false);
    try {
      await imprimirReceta(receta);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo abrir la impresión', text: err.message || 'Reintenta.' });
    }
  }

  return (
    <div className="relative" ref={contenedor}>
      <button
        ref={boton}
        type="button"
        className="btn-secondary !px-3"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        <i className="fa-solid fa-download" aria-hidden="true" /> Descargar{' '}
        <i className={`fa-solid fa-chevron-${abierto ? 'up' : 'down'} ml-1 !text-xs`} aria-hidden="true" />
      </button>

      {abierto && (
        <div
          role="menu"
          aria-label="Formatos de descarga"
          className="glass-panel absolute right-0 z-30 mt-2 min-w-56 p-2 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
            onClick={pdf}
          >
            <i className="fa-solid fa-file-pdf text-danger" aria-hidden="true" />
            <span>
              <strong>PDF</strong>
              <br />
              <span className="text-xs text-muted-foreground">Abrir impresión / guardar PDF</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
            onClick={imagen}
          >
            <i className="fa-solid fa-image text-primary" aria-hidden="true" />
            <span>
              <strong>Imagen (PNG)</strong>
              <br />
              <span className="text-xs text-muted-foreground">Tarjeta lista para compartir</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
