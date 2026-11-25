import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { exito, fracaso } from '../../services/toast.js';
import { descargarQR, generarQRPng, imprimirQR, urlPublicaCarta } from '../../services/qr.js';

const VALORES = {
  foreground: '#0f172a',
  background: '#ffffff',
  size: 512,
  logo: null,
  marco: true,
  etiqueta: '',
};

/**
 * Modal de QR personalizable (punto 7 del encargo): colores, tamaño, logo
 * central, marco y etiqueta; live preview; descarga PNG/SVG y guardar como
 * PDF con el diálogo de impresión. El QR abre la carta digital del chef.
 */
export default function GenerarQR({ open, onClose, userId, nombre }) {
  const [opciones, setOpciones] = useState({ ...VALORES, etiqueta: nombre || '' });
  const [vista, setVista] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !userId) return;
    let vivo = true;
    let urlCreado = null;
    const url = urlPublicaCarta(userId);
    generarQRPng({ ...opciones, url })
      .then((blob) => {
        if (!vivo) return;
        urlCreado = URL.createObjectURL(blob);
        setVista(urlCreado);
      })
      .catch(() => {
        if (vivo) setError('No se pudo generar la vista previa del QR.');
      });
    return () => {
      vivo = false;
      if (urlCreado) URL.revokeObjectURL(urlCreado);
    };
  }, [open, userId, opciones]);

  function cambiar(clave, valor) {
    setOpciones((o) => ({ ...o, [clave]: valor }));
  }

  function subirLogo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (archivo.size > 2 * 1024 * 1024) {
      setError('El logo debe pesar menos de 2 MB.');
      return;
    }
    const lector = new FileReader();
    lector.onload = () => cambiar('logo', String(lector.result));
    lector.readAsDataURL(archivo);
  }

  const configuracion = { ...opciones, url: urlPublicaCarta(userId) };

  async function descargar(formato) {
    try {
      await descargarQR(configuracion, formato, 'qr-carta-sazonlab');
      exito(`QR descargado en ${formato.toUpperCase()}`);
    } catch (err) {
      fracaso(err?.message || 'No se pudo descargar el QR');
    }
  }

  async function imprimir() {
    try {
      await imprimirQR(configuracion);
    } catch (err) {
      fracaso(err?.message || 'No se pudo imprimir el QR');
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="titulo-generar-qr" className="max-w-4xl">
      <h2 id="titulo-generar-qr" className="text-lg font-semibold">
        <i className="fa-solid fa-qrcode text-primary" aria-hidden="true" /> Código QR de mi carta
      </h2>
      <p className="mt-1 break-all text-sm text-muted-foreground">
        Al escanearlo se abre tu carta digital: <strong>{configuracion.url}</strong>
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              Color del QR
              <input
                type="color"
                value={opciones.foreground}
                onChange={(e) => cambiar('foreground', e.target.value)}
                aria-label="Color del QR"
                className="h-9 w-12 cursor-pointer rounded-md border-0 bg-transparent"
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              Color de fondo
              <input
                type="color"
                value={opciones.background}
                onChange={(e) => cambiar('background', e.target.value)}
                aria-label="Color de fondo del QR"
                className="h-9 w-12 cursor-pointer rounded-md border-0 bg-transparent"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Tamaño (px)
            <input
              type="range"
              min="256"
              max="1024"
              step="64"
              value={opciones.size}
              onChange={(e) => cambiar('size', Number(e.target.value))}
            />
            <span className="text-xs text-muted-foreground">{opciones.size} px</span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Etiqueta / marco
            <input
              className="field"
              value={opciones.etiqueta}
              onChange={(e) => cambiar('etiqueta', e.target.value)}
              placeholder="Ej. Escanea y mira nuestra carta"
              maxLength={60}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={opciones.marco}
              onChange={(e) => cambiar('marco', e.target.checked)}
            />
            Mostrar marco
          </label>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="logo-qr">
              Logo central
            </label>
            <input id="logo-qr" type="file" accept="image/*" className="field !py-2 text-xs" onChange={subirLogo} />
            {opciones.logo && (
              <button type="button" className="btn-ghost w-fit !px-3 !text-xs" onClick={() => cambiar('logo', null)}>
                <i className="fa-solid fa-xmark" aria-hidden="true" /> Quitar logo
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary !px-3" onClick={() => descargar('png')}>
              <i className="fa-solid fa-download" aria-hidden="true" /> Descargar PNG
            </button>
            <button type="button" className="btn-secondary !px-3" onClick={() => descargar('svg')}>
              <i className="fa-solid fa-code" aria-hidden="true" /> Descargar SVG
            </button>
            <button type="button" className="btn-secondary !px-3" onClick={imprimir}>
              <i className="fa-solid fa-file-pdf" aria-hidden="true" /> Guardar PDF
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-muted/40 p-4">
          <p className="text-sm font-medium">Vista previa</p>
          {vista ? (
            <img src={vista} alt="Vista previa del código QR" className="max-h-72 w-auto rounded-xl" />
          ) : (
            <p className="text-sm text-muted-foreground" role="status">
              <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Generando…
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button type="button" className="btn-ghost !px-3" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
