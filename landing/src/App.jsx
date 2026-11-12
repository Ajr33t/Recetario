/**
 * Página oficial de SazónLab — Fase 7 (Sprint 10 IEEE).
 * Estructura semántica: <header>, <main>, <footer>; estilos Liquid Glass.
 *
 * - Hero con captura REAL de la aplicación (landing/public/captura-app.png).
 * - Enlaces reales: demo web (http://localhost:5173) y descarga del .exe.
 * - Sección «Cómo funciona» (3 pasos) + funciones + descarga.
 * - Vistas legales por hash (#/privacidad, #/terminos) sin dependencias:
 *   el mismo texto que publica la app en /privacidad y /terminos.
 * - SEO: robots.txt + JSON-LD en index.html.
 */
import { useEffect, useState } from 'react';

const DEMO_URL = 'http://localhost:5173/';
const EXE_URL = './SazónLab-Setup-1.0.0.exe';
const ACTUALIZACION = '11 de noviembre de 2026';

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

const PASOS = [
  {
    icon: 'fa-magnifying-glass',
    titulo: '1. Di lo que tienes',
    texto: 'Escribe tus ingredientes (pollo, tomate, arroz…) o explora por categorías y áreas.',
  },
  {
    icon: 'fa-wand-magic-sparkles',
    titulo: '2. Recibe sugerencias',
    texto:
      'SazónLab ordena las recetas por lo que te falta y, si quieres, usa IA para proponerte ideas nuevas.',
  },
  {
    icon: 'fa-utensils',
    titulo: '3. Cocina y guarda',
    texto:
      'Sigue los pasos, márcala como favorita y guárdala en tu recetario con notas y checklist.',
  },
];

/** Devuelve 'privacidad' | 'terminos' | null según el hash actual. */
function vistaLegal() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash === 'privacidad') return 'privacidad';
  if (hash === 'terminos') return 'terminos';
  return null;
}

/** Contenido legal compartido (idéntico al de la app). */
function ContenidoLegal({ tipo }) {
  const esPrivacidad = tipo === 'privacidad';
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 id="legal-titulo">
        <i
          className={`fa-solid ${
            esPrivacidad ? 'fa-shield-halved' : 'fa-file-contract'
          } text-primary`}
          aria-hidden="true"
        />{' '}
        {esPrivacidad ? 'Política de privacidad' : 'Términos del servicio'}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Última actualización: {ACTUALIZACION}</p>

      {esPrivacidad ? (
        <>
          <section className="surface-section mt-4" aria-labelledby="priv-1">
            <h2 id="priv-1">1. ¿Qué datos recopilamos?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              SazónLab recopila solo lo necesario para funcionar:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
              <li>
                <strong>Cuenta:</strong> nombre, correo electrónico y contraseña (guardada cifrada
                con bcrypt; jamás en texto plano).
              </li>
              <li>
                <strong>Recetas propias:</strong> títulos, descripciones, ingredientes, pasos,
                imágenes que subas y notas — tus creaciones te pertenecen a ti.
              </li>
              <li>
                <strong>Datos de uso:</strong> historial de búsquedas y notificaciones locales,
                guardados solo en tu navegador/dispositivo.
              </li>
            </ul>
          </section>

          <section className="surface-section mt-4" aria-labelledby="priv-2">
            <h2 id="priv-2">2. Dónde se guarda tu información</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
              <li>
                <strong>Aplicación de escritorio (.exe):</strong> todo queda en tu propio PC, en una
                base de datos local (SQLite). No sale de tu equipo.
              </li>
              <li>
                <strong>Demo web:</strong> las recetas y tu cuenta se guardan en la base de datos
                del servidor (SQLite/PostgreSQL). Las preferencias (tema, tamaño de fuente, tour)
                viven en el almacenamiento local de tu navegador.
              </li>
            </ul>
          </section>

          <section className="surface-section mt-4" aria-labelledby="priv-3">
            <h2 id="priv-3">3. Servicios de terceros</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
              <li>
                <strong>TheMealDB:</strong> API pública de recetas que usamos para sugerirte
                platillos cuando lo pides.
              </li>
              <li>
                <strong>OpenAI / Gemini:</strong> opcional; solo si activas la sugerencia con IA.
                Tus ingredientes se envían a estos proveedores para generar la respuesta.
              </li>
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              No vendemos ni compartimos tus datos con publicidad ni con terceros distintos de los
              indicados.
            </p>
          </section>

          <section className="surface-section mt-4" aria-labelledby="priv-4">
            <h2 id="priv-4">4. Tus derechos</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Puedes exportar todas tus recetas en JSON desde <strong>Ajustes → Datos</strong>,
              editar o eliminar tus recetas (la papelera las purga a los 30 días) y eliminar tu
              cuenta desde <strong>Perfil</strong>. Escríbenos a{' '}
              <strong>soporte@sazonlab.test</strong> si necesitas ayuda con esto.
            </p>
          </section>
        </>
      ) : (
        <>
          <section className="surface-section mt-4" aria-labelledby="ter-1">
            <h2 id="ter-1">1. Uso del servicio</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              SazónLab es una herramienta gratuita de recetario personal. Al usarla te comprometes a
              no intentar dañar el servicio, acceder a cuentas ajenas ni publicar contenido ofensivo
              o ilegal en tus recetas.
            </p>
          </section>

          <section className="surface-section mt-4" aria-labelledby="ter-2">
            <h2 id="ter-2">2. Propiedad del contenido</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Tus recetas son tuyas. Nosotros no reclamos derecho sobre ellas. Las recetas sugeridas
              provienen de TheMealDB (licencia de sus creadores) y de resultados generados por IA,
              los cuales se ofrecen solo como inspiración.
            </p>
          </section>

          <section className="surface-section mt-4" aria-labelledby="ter-3">
            <h2 id="ter-3">3. Aviso sobre la IA</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Las sugerencias con inteligencia artificial pueden contener errores, cantidades
              imprecisas o alergias no mencionadas.{' '}
              <strong>Revisa siempre ingredientes y cantidades</strong> antes de cocinar: tú eres
              responsable final de lo que preparas.
            </p>
          </section>

          <section className="surface-section mt-4" aria-labelledby="ter-4">
            <h2 id="ter-4">4. Limitación de responsabilidad</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              El servicio se ofrece «tal cual». No garantizamos disponibilidad permanente ni somos
              responsables por daños derivados del uso indebido de las recetas o del servicio de IA.
            </p>
          </section>

          <section className="surface-section mt-4" aria-labelledby="ter-5">
            <h2 id="ter-5">5. Cambios</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Podemos actualizar estos términos; publicaremos la fecha de la última versión en esta
              página. Seguir usando SazónLab después de un cambio implica aceptarlo.
            </p>
          </section>
        </>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        ¿Dudas? Escríbenos a <strong>soporte@sazonlab.test</strong>.
      </p>
      <p className="mt-6">
        <a href="#/" className="btn-secondary">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Volver al inicio
        </a>
      </p>
    </article>
  );
}

export default function App() {
  const [legal, setLegal] = useState(vistaLegal);

  // Cambios de hash: muestra/oculta las vistas legales (#/privacidad, #/terminos)
  useEffect(() => {
    const onChange = () => setLegal(vistaLegal());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  // Al entrar/Salir de una vista legal: arriba, o desplazar al ancla pedida
  useEffect(() => {
    if (legal) {
      window.scrollTo(0, 0);
      return;
    }
    const ancla = window.location.hash.replace(/^#/, '');
    if (ancla && !ancla.startsWith('/')) {
      requestAnimationFrame(() => {
        document.getElementById(ancla)?.scrollIntoView({ block: 'start' });
      });
    }
  }, [legal]);

  if (legal) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <a href="#contenido-principal" className="skip-link">
          Saltar al contenido principal
        </a>
        <header className="glass sticky top-0 z-50">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
            <a
              href="#/"
              className="flex items-center gap-2 text-lg font-bold"
              aria-label="SazónLab — inicio"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"
                aria-hidden="true"
              >
                <i className="fa-solid fa-utensils" />
              </span>
              Sazón<span className="text-primary">Lab</span>
            </a>
            <nav aria-label="Navegación principal" className="flex items-center gap-3">
              <a href="#/privacidad" className="btn-ghost">
                Privacidad
              </a>
              <a href="#/terminos" className="btn-ghost">
                Términos
              </a>
            </nav>
          </div>
        </header>
        <main id="contenido-principal" tabIndex={-1} className="flex-1 outline-none">
          <ContenidoLegal tipo={legal} />
        </main>
        <footer className="glass border-t border-[var(--glass-border)]">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
            <p>© 2026 SazónLab — SENA · Centro de Procesos Industriales y Construcción</p>
            <nav aria-label="Enlaces del pie" className="flex gap-4">
              <a href="#/" className="hover:text-foreground">
                Inicio
              </a>
              <a href="#/privacidad" className="hover:text-foreground">
                Privacidad
              </a>
              <a href="#/terminos" className="hover:text-foreground">
                Términos
              </a>
            </nav>
          </div>
        </footer>
      </div>
    );
  }

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
            <a href={DEMO_URL} className="btn-primary !px-6 !py-3 text-base" id="demo">
              <i className="fa-solid fa-play" aria-hidden="true" /> Probar la demo web
            </a>
            <a href="#descarga" className="btn-secondary !px-6 !py-3 text-base">
              <i className="fa-brands fa-windows" aria-hidden="true" /> Descargar para Windows
            </a>
          </div>
        </section>

        {/* Captura REAL de la aplicación (Fase 7) */}
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
            <img
              src="captura-app.png"
              alt="Captura de SazónLab: inicio con tema Océano en modo claro, tarjetas de recetas destacadas y buscador de ingredientes"
              className="mt-2 w-full rounded-b-xl border border-[var(--glass-border)] shadow-lg"
              loading="lazy"
              width="1280"
              height="720"
            />
          </div>
        </section>

        {/* Cómo funciona (Fase 7) */}
        <section
          id="como-funciona"
          className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16"
          aria-labelledby="pasos-titulo"
        >
          <h2 id="pasos-titulo" className="text-center">
            ¿Cómo funciona?
          </h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-3" role="list">
            {PASOS.map(({ icon, titulo, texto }) => (
              <li key={titulo} className="glass-card-hover text-center">
                <span
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-xl text-primary"
                  aria-hidden="true"
                >
                  <i className={`fa-solid ${icon}`} />
                </span>
                <h3>{titulo}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Funciones */}
        <section
          id="funciones"
          className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-16"
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
            <a href={EXE_URL} className="btn-primary mt-5 !px-6 !py-3 text-base" download>
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
            <a href="#/privacidad" className="hover:text-foreground">
              Privacidad
            </a>
            <a href="#/terminos" className="hover:text-foreground">
              Términos
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
