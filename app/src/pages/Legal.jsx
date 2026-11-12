import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
// Fuente única de verdad (raíz /legal): la misma que publica la landing.
import { CONTACTO, Privacidad, Terminos } from '../../../legal/contenido-legal.jsx';

/**
 * Páginas legales — Fase 7 (Sprint 10 IEEE).
 * Una sola vista para dos documentos: «Privacidad» y «Términos».
 * Se muestra en las rutas /privacidad y /terminos (HashRouter).
 * El texto (normativa colombiana) vive en legal/contenido-legal.jsx.
 */

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
        ¿Dudas? Escríbenos a <strong>{CONTACTO}</strong>.
      </p>
    </article>
  );
}
