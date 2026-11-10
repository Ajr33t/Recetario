import { Link } from 'react-router-dom';

/** Mis recetas (RF-06 CRUD — se implementa en la Fase 5). */
export default function MisRecetas() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Mis recetas</h1>
          <p className="mt-1 text-muted-foreground">
            Crea, edita y organiza tu recetario personal.
          </p>
        </div>
        <Link to="/login" className="btn-primary" aria-label="Iniciar sesión para crear recetas">
          <i className="fa-solid fa-plus" aria-hidden="true" />
          Nueva receta
        </Link>
      </header>

      <div className="glass-card flex flex-col items-center gap-2 py-10 text-center">
        <i className="fa-solid fa-book-open text-4xl text-primary" aria-hidden="true" />
        <p className="font-medium">Tu recetario está vacío</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Inicia sesión y crea tu primera receta con ingredientes, pasos, fotos y etiquetas. El CRUD
          completo (editar, duplicar, papelera y versiones) está disponible desde la Fase 5.
        </p>
      </div>
    </div>
  );
}
