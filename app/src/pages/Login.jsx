import { useState } from 'react';

/** Inicio de sesión y registro (RF-01/RF-02 — backend en la Fase 3). */
export default function Login() {
  const [aviso, setAviso] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setAviso('La autenticación se habilita en la Fase 3 (JWT + bcrypt en el servidor).');
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <header className="text-center">
        <span
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl text-primary-foreground"
          aria-hidden="true"
        >
          <i className="fa-solid fa-user" />
        </span>
        <h1>Iniciar sesión</h1>
        <p className="mt-1 text-muted-foreground">
          Accede para crear recetas, favoritos y sincronizar tus preferencias.
        </p>
      </header>

      <form className="glass-card flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
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
            required
          />
        </div>

        <div>
          <label htmlFor="contrasena" className="mb-1 block text-sm font-medium">
            Contraseña
          </label>
          <input
            id="contrasena"
            name="contrasena"
            type="password"
            className="field"
            autoComplete="current-password"
            placeholder="••••••••"
            minLength={8}
            required
          />
        </div>

        <button type="submit" className="btn-primary">
          <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
          Entrar
        </button>

        <button type="button" className="btn-ghost" disabled>
          Crear una cuenta (Fase 3)
        </button>

        {aviso && (
          <p role="status" className="text-center text-sm text-muted-foreground">
            <i className="fa-solid fa-circle-info text-primary" aria-hidden="true" /> {aviso}
          </p>
        )}
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <button type="button" className="underline hover:text-foreground" disabled>
          ¿Olvidaste tu contraseña?
        </button>
      </p>
    </div>
  );
}
