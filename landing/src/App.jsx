/**
 * Página oficial de SazónLab (Fase 1: estructura base con
 * lenguaje Liquid Glass; contenido completo en la Fase 7).
 * Estructura semántica: <header>, <main>, <footer>.
 */
const FEATURES = [
  {
    icon: 'fa-magnifying-glass',
    titulo: 'Busca por ingredientes',
    texto: 'Escribe lo que tienes en casa y recibe recetas ordenadas por ingredientes faltantes.',
  },
  {
    icon: 'fa-wand-magic-sparkles',
    titulo: 'Sugerencias con IA',
    texto: 'Integración con APIs de recetas e inteligencia artificial con fallback automático.',
  },
  {
    icon: 'fa-book-open',
    titulo: 'Tus recetas propias',
    texto: 'Crea, edita, duplica y comparte tu recetario con historial de versiones y papelera.',
  },
  {
    icon: 'fa-palette',
    titulo: '12 temas × 3 modos',
    texto: 'Personaliza la apariencia con 36 combinaciones y modo de alto contraste accesible.',
  },
  {
    icon: 'fa-universal-access',
    titulo: 'Accesible de verdad',
    texto: 'Cumple WCAG 2.1 AA: navegación por teclado, lectores de pantalla y foco visible.',
  },
  {
    icon: 'fa-desktop',
    titulo: 'Web y escritorio',
    texto: 'Úsalo en el navegador o instálalo en Windows con modo offline básico.',
  },
];

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a href="#contenido-principal" className="skip-link">
        Saltar al contenido principal
      </a>

      {/* HEADER */}
      <header className="glass sticky top-0 z-50">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2 text-lg font-bold" aria-label="SazónLab">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"
              aria-hidden="true"
            >
              <i className="fa-solid fa-utensils" />
            </span>
            Sazón<span className="text-primary">Lab</span>
          </span>
          <nav aria-label="Navegación principal" className="flex items-center gap-3">
            <a href="#funciones" className="btn-ghost hidden sm:inline-flex">
              Funciones
            </a>
            <a href="#descarga" className="btn-primary">
              <i className="fa-solid fa-download" aria-hidden="true" /> Descargar
            </a>
          </nav>
        </div>
      </header>

      {/* MAIN */}
      <main id="contenido-principal" tabIndex={-1} className="flex-1 outline-none">
        {/* Hero */}
        <section
          className="mx-auto w-full max-w-6xl px-4 py-16 text-center"
          aria-labelledby="hero-titulo"
        >
          <span className="chip mx-auto mb-4">
            <i className="fa-solid fa-flask text-primary" aria-hidden="true" /> Recetario
            inteligente con IA
          </span>
          <h1 id="hero-titulo" className="mx-auto max-w-3xl text-4xl leading-tight sm:text-5xl">
            Cocina con lo que <span className="text-primary">ya tienes</span> en casa
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            SazónLab analiza tus ingredientes y te sugiere recetas posibles, te ayuda a crear tu
            recetario propio y te deja personalizar todo con un diseño Liquid Glass precioso.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a href="#" className="btn-primary !px-6 !py-3 text-base">
              <i className="fa-solid fa-play" aria-hidden="true" /> Probar la demo web
            </a>
            <a href="#descarga" className="btn-secondary !px-6 !py-3 text-base">
              <i className="fa-brands fa-windows" aria-hidden="true" /> Descargar para Windows
            </a>
          </div>
        </section>

        {/* Captura / vista previa */}
        <section
          className="mx-auto w-full max-w-5xl px-4"
          aria-label="Vista previa de la aplicación"
        >
          <div className="glass-card overflow-hidden !p-3">
            <div
              className="flex h-8 items-center gap-2 rounded-t-xl bg-muted px-3"
              aria-hidden="true"
            >
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <div className="grid gap-3 rounded-b-xl bg-gradient-to-br from-primary/15 to-accent/10 p-6 sm:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="glass rounded-xl p-4 text-left">
                  <div className="mb-2 h-16 rounded-lg bg-primary/20" />
                  <div className="mb-1 h-3 w-3/4 rounded bg-muted-foreground/40" />
                  <div className="h-3 w-1/2 rounded bg-muted-foreground/25" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Funciones */}
        <section
          id="funciones"
          className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16"
          aria-labelledby="funciones-titulo"
        >
          <h2 id="funciones-titulo" className="text-center">
            Todo lo que necesitas para cocinar mejor
          </h2>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {FEATURES.map(({ icon, titulo, texto }) => (
              <li key={titulo} className="glass-card-hover">
                <span
                  className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-xl text-primary"
                  aria-hidden="true"
                >
                  <i className={`fa-solid ${icon}`} />
                </span>
                <h3>{titulo}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{texto}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Descarga */}
        <section
          id="descarga"
          className="mx-auto w-full max-w-4xl scroll-mt-20 px-4 pb-16"
          aria-labelledby="descarga-titulo"
        >
          <div className="glass-card text-center">
            <i className="fa-brands fa-windows text-5xl text-primary" aria-hidden="true" />
            <h2 id="descarga-titulo" className="mt-4">
              SazónLab para Windows
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Instala la aplicación de escritorio y consulta tus recetas guardadas incluso sin
              conexión a internet.
            </p>
            <a href="#" className="btn-primary mt-5 !px-6 !py-3 text-base">
              <i className="fa-solid fa-download" aria-hidden="true" /> Descargar .exe
            </a>
            <p className="mt-3 text-sm text-muted-foreground">
              Windows 10 o superior · Instalador NSIS · v1.0.0
            </p>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="glass border-t border-[var(--glass-border)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p>© 2026 SazónLab — SENA · Centro de Procesos Industriales y Construcción</p>
          <nav aria-label="Enlaces del pie" className="flex gap-4">
            <a href="#funciones" className="hover:text-foreground">
              Funciones
            </a>
            <a href="#descarga" className="hover:text-foreground">
              Descargar
            </a>
            <a href="#" className="hover:text-foreground">
              Privacidad
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
