import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Páginas legales — Fase 7 (Sprint 10 IEEE).
 * Una sola vista para dos documentos: «Privacidad» y «Términos».
 * Se muestra en las rutas /privacidad y /terminos (HashRouter).
 * El texto es el mismo que publica la landing (#/privacidad, #/terminos).
 */

const ACTUALIZACION = '11 de noviembre de 2026';

function Privacidad() {
  return (
    <>
      <p className="mt-1 text-sm text-muted-foreground">Última actualización: {ACTUALIZACION}</p>

      <section className="surface-section mt-4" aria-labelledby="priv-1">
        <h2 id="priv-1">1. ¿Qué datos recopilamos?</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          SazónLab recopila solo lo necesario para funcionar:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
          <li>
            <strong>Cuenta:</strong> nombre, correo electrónico y contraseña (guardada cifrada con
            bcrypt; jamás en texto plano).
          </li>
          <li>
            <strong>Recetas propias:</strong> títulos, descripciones, ingredientes, pasos, imágenes
            que subas y notas — tus creaciones te pertenecen a ti.
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
            <strong>Demo web:</strong> las recetas y tu cuenta se guardan en la base de datos del
            servidor (SQLite/PostgreSQL). Las preferencias (tema, tamaño de fuente, tour) viven en
            el almacenamiento local de tu navegador.
          </li>
        </ul>
      </section>

      <section className="surface-section mt-4" aria-labelledby="priv-3">
        <h2 id="priv-3">3. Servicios de terceros</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
          <li>
            <strong>TheMealDB:</strong> API pública de recetas que usamos para sugerirte platillos
            cuando lo pides.
          </li>
          <li>
            <strong>OpenAI / Gemini:</strong> opcional; solo si activas la sugerencia con IA. Tus
            ingredientes se envían a estos proveedores para generar la respuesta.
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
          Puedes exportar todas tus recetas en JSON desde <strong>Ajustes → Datos</strong>, editar o
          eliminar tus recetas (la papelera las purga a los 30 días) y eliminar tu cuenta desde{' '}
          <strong>Perfil</strong>. Escríbenos a <strong>soporte@sazonlab.test</strong> si necesitas
          ayuda con esto.
        </p>
      </section>
    </>
  );
}

function Terminos() {
  return (
    <>
      <p className="mt-1 text-sm text-muted-foreground">Última actualización: {ACTUALIZACION}</p>

      <section className="surface-section mt-4" aria-labelledby="ter-1">
        <h2 id="ter-1">1. Uso del servicio</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          SazónLab es una herramienta gratuita de recetario personal. Al usarla te comprometes a no
          intentar dañar el servicio, acceder a cuentas ajenas ni publicar contenido ofensivo o
          ilegal en tus recetas.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-2">
        <h2 id="ter-2">2. Propiedad del contenido</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tus recetas son tuyas. Nosotros no reclamos derecho sobre ellas. Las recetas sugeridas
          provienen de TheMealDB (licencia de sus creadores) y de resultados generados por IA, los
          cuales se ofrecen solo como inspiración.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-3">
        <h2 id="ter-3">3. Aviso sobre la IA</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Las sugerencias con inteligencia artificial pueden contener errores, cantidades imprecisas
          o alergias no mencionadas. <strong>Revisa siempre ingredientes y cantidades</strong> antes
          de cocinar: tú eres responsable final de lo que preparas.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-4">
        <h2 id="ter-4">4. Limitación de responsabilidad</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          El servicio se ofrece «tal cual». No garantizamos disponibilidad permanente (99% de tiempo
          de operación es nuestro compromiso de mejora, no una promesa de contrato) ni somos
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
  );
}

export default function Legal({ tipo }) {
  const [searchParams] = useSearchParams();
  // Respaldo por query (?doc=privacidad) por si la ruta cambia
  const documento = searchParams.get('doc') || tipo;
  const esPrivacidad = documento !== 'terminos';

  useEffect(() => {
    document.title = esPrivacidad ? 'Privacidad — SazónLab' : 'Términos — SazónLab';
    return () => {
      document.title = 'SazónLab — Recetario Inteligente';
    };
  }, [esPrivacidad]);

  return (
    <article className="max-w-3xl">
      <h1 id="legal-titulo">
        <i
          className={`fa-solid ${esPrivacidad ? 'fa-shield-halved' : 'fa-file-contract'} text-primary`}
          aria-hidden="true"
        />{' '}
        {esPrivacidad ? 'Política de privacidad' : 'Términos del servicio'}
      </h1>
      {esPrivacidad ? <Privacidad /> : <Terminos />}

      <p className="mt-6 text-sm text-muted-foreground">
        ¿Dudas? Escríbenos a <strong>soporte@sazonlab.test</strong>.
      </p>
    </article>
  );
}
