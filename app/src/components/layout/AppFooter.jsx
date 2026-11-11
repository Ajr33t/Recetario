import { useNavigate } from 'react-router-dom';

/** <footer> con información legal, versión (CU-55) y accesibilidad. */
export default function AppFooter() {
  const navigate = useNavigate();

  // Lleva a la sección «Accesibilidad» del menú Ajustes (HashRouter: no
  // usar <a href="#..."> porque cambiaría el hash de la ruta).
  function irAAccesibilidad() {
    navigate('/ajustes');
    // Espera al render de la página y desplaza hasta la sección
    setTimeout(() => {
      document.getElementById('accesibilidad-titulo')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 120);
  }

  return (
    <footer className="glass no-print mt-8 border-t border-[var(--glass-border)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>© 2026 SazónLab · Recetario Inteligente</p>

        <nav aria-label="Enlaces del pie de página" className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={irAAccesibilidad}
            className="hover:text-foreground hover:underline"
          >
            Accesibilidad
          </button>
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
