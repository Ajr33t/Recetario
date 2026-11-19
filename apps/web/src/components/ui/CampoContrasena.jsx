import { useState } from 'react';

/**
 * Campo de contraseña con botón de «mostrar/ocultar» (ojo) — Fase 11.
 * Envuelve el input en un label (accesible) y añade un botón con
 * aria-pressed + aria-label en español. Acepta las mismas props que
 * <input type="password"> (id, name, value, onChange, autoComplete…).
 */
export default function CampoContrasena({ label, hint, className = '', ...props }) {
  const [visible, setVisible] = useState(false);
  const id = props.id || 'contrasena';

  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`} htmlFor={id}>
      {label}
      <span className="relative block">
        <input
          {...props}
          id={id}
          type={visible ? 'text' : 'password'}
          className="field !pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute inset-y-0 right-1 my-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[rgb(var(--muted)/0.7)] hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--primary))]"
        >
          <i className={`fa-solid ${visible ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
        </button>
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
