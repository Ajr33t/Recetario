/** <footer> con información legal, versión (CU-55) y accesibilidad. */
export default function AppFooter() {
  return (
    <footer className="glass mt-8 border-t border-[var(--glass-border)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>© 2026 SazónLab · Recetario Inteligente — hecho con 💎 Liquid Glass</p>

        <nav aria-label="Enlaces del pie de página" className="flex flex-wrap items-center gap-4">
          <a href="#contenido-principal" className="hover:text-foreground">
            Accesibilidad
          </a>
          <span aria-hidden="true">·</span>
          <a href="#" className="hover:text-foreground">
            Términos
          </a>
          <span aria-hidden="true">·</span>
          <a href="#" className="hover:text-foreground">
            Privacidad
          </a>
          <span aria-hidden="true">·</span>
          <span className="chip" aria-label="Versión del sistema">
            <i className="fa-solid fa-code-branch" aria-hidden="true" /> v1.0.0
          </span>
        </nav>
      </div>
    </footer>
  );
}
