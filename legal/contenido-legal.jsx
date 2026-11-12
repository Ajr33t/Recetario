/**
 * Contenido legal compartido — Fase 7 (Sprint 10 IEEE).
 *
 * Fuente única de verdad: lo consumen la app (/privacidad y /terminos) y la
 * landing (#/privacidad y #/terminos). Al editar aquí se actualizan las dos
 * superficies a la vez.
 *
 * Normativa colombiana aplicable (verificada en la fase):
 * - Constitución Política: art. 15 (datos personales / hábeas data),
 *   art. 20 (información) y art. 86 (acción de tutela).
 * - Ley 1581 de 2012 + Decreto 1377 de 2013 + Decreto 1074 de 2015
 *   (protección de datos personales).
 * - Ley 1266 de 2009 (hábeas data en entidades financieras — no aplica
 *   directamente, se cita por exhaustividad).
 * - Ley 1480 de 2011, modificada por la Ley 2439 de 2024 (estatuto del
 *   consumidor).
 * - Ley 527 de 1999 (mensajes de datos y comercio electrónico).
 * - Ley 1712 de 2014 (transparencia y acceso a la información pública).
 * - Ley 1755 de 2015 (derecho de petición).
 * - Ley 1273 de 2009 (protección de la información y los datos en sistemas
 *   informáticos).
 * - Ley 23 de 1982 (derechos de autor).
 * - Corte Constitucional, Sentencia T-625 de 2015 (protección de datos
 *   personales en medios electrónicos).
 */

/** Fecha de la última actualización de ambos documentos. */
export const ACTUALIZACION = '11 de noviembre de 2026';

/** Correo único de contacto legal y PQRSD. */
export const CONTACTO = 'soporte@sazonlab.test';

export function Privacidad() {
  return (
    <>
      <p className="mt-1 text-sm text-muted-foreground">Última actualización: {ACTUALIZACION}</p>

      <section className="surface-section mt-4" aria-labelledby="priv-1">
        <h2 id="priv-1">1. Responsable del tratamiento</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          <strong>SazónLab — Recetario Inteligente</strong>, proyecto académico desarrollado con el
          Centro de Procesos Industriales y Construcción del SENA. Correo de contacto:{' '}
          <strong>{CONTACTO}</strong>.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          En términos de la <strong>Ley 1581 de 2012</strong>, nosotros somos el{' '}
          <strong>responsable</strong> del tratamiento de tus datos personales; las bases de datos
          que los alojan (SQLite local, SQLite/PostgreSQL del servidor) son el medio técnico.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="priv-2">
        <h2 id="priv-2">2. Marco normativo aplicable</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Este tratamiento se rige por la legislación colombiana vigente:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
          <li>
            <strong>Constitución Política</strong>: artículo 15 (derecho a conocer, actualizar y
            rectificar datos personales — hábeas data), artículo 20 (derecho a informar y recibir
            información) y artículo 86 (acción de tutela).
          </li>
          <li>
            <strong>Ley Estatutaria 1581 de 2012</strong> y sus decretos reglamentarios{' '}
            <strong>1377 de 2013</strong> y <strong>1074 de 2015</strong>: régimen general de
            protección de datos personales.
          </li>
          <li>
            <strong>Ley 1266 de 2009</strong>: hábeas data en entidades financieras. No aplica
            directamente a SazónLab (no manejamos datos crediticios), pero sus estándares de
            circulación y corrección guían nuestra práctica.
          </li>
          <li>
            <strong>Ley 1480 de 2011</strong> (modificada por la <strong>Ley 2439 de 2024</strong>):
            estatuto del consumidor — información veraz y reclamos ante la Superintendencia de
            Industria y Comercio.
          </li>
          <li>
            <strong>Ley 527 de 1999</strong>: mensajes de datos, comercio electrónico y firmas
            digitales (tus aceptaciones electrónicas tienen validez legal).
          </li>
          <li>
            <strong>Ley 1712 de 2014</strong>: transparencia y derecho de acceso a la información
            pública, por ser el SENA una entidad pública.
          </li>
          <li>
            <strong>Ley 1755 de 2015</strong>: derecho de petición (PQRSD) por medios electrónicos.
          </li>
          <li>
            <strong>Ley 1273 de 2009</strong>: protección de la información y los datos en sistemas
            informáticos (acceso no autorizado es delito).
          </li>
          <li>
            <strong>Ley 23 de 1982</strong>: derechos de autor sobre tus recetas, textos e imágenes.
          </li>
          <li>
            <strong>Corte Constitucional, Sentencia T-625 de 2015</strong>: protección de datos
            personales en medios electrónicos.
          </li>
        </ul>
      </section>

      <section className="surface-section mt-4" aria-labelledby="priv-3">
        <h2 id="priv-3">3. ¿Qué datos recopilamos?</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
          <li>
            <strong>Cuenta (art. 13, Ley 1581):</strong> nombre, correo electrónico y contraseña
            cifrada con bcrypt — jamás en texto plano.
          </li>
          <li>
            <strong>Recetas propias:</strong> títulos, descripciones, ingredientes, pasos, imágenes
            que subas y notas. Son tus datos en cuanto titular.
          </li>
          <li>
            <strong>Datos de uso:</strong> historial de búsquedas y notificaciones locales,
            guardados solo en tu navegador/dispositivo.
          </li>
          <li>
            <strong>Datos de auditoría:</strong> registro de operaciones críticas (crear, editar,
            borrar) exigido por el RNF-01 del proyecto.
          </li>
        </ul>
        <p className="mt-2 text-sm text-muted-foreground">
          <strong>No recopilamos datos sensientes</strong> (salud, biometría, origen étnico, etc.)
          conforme al artículo 5 de la Ley 1581 de 2012, ni vendemos tus datos a terceros. Si algún
          día fuéramos a hacerlo, te lo pediríamos primero con autorización expresa (art. 12).
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="priv-4">
        <h2 id="priv-4">4. Finalidades y base jurídica</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
          <li>
            <strong>Prestarte el servicio:</strong> crear tu cuenta, guardar tus recetas, favoritos
            y preferencias (base: ejecución del contrato de uso, art. 12 Ley 1581).
          </li>
          <li>
            <strong>Sugerirte recetas:</strong> buscar en TheMealDB y, si lo activas, en
            OpenAI/Gemini (base: tu autorización previa e informada).
          </li>
          <li>
            <strong>Seguridad y mejora:</strong> prevenir abusos y auditar operaciones críticas
            (base: obligaciones legales y de seguridad del servicio).
          </li>
          <li>
            <strong>Nunca:</strong> publicidad de terceros, venta de datos o perfiles comerciales
            sin tu autorización expresa.
          </li>
        </ul>
      </section>

      <section className="surface-section mt-4" aria-labelledby="priv-5">
        <h2 id="priv-5">5. Autorización previa e informada</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Conforme a los artículos 9 a 12 de la Ley 1581 de 2012, antes de tratar tus datos te
          informamos claramente esta política y solicitamos tu autorización: se presta al crear tu
          cuenta (casilla de aceptación) o, para datos opcionales (IA), al activar esa función.
          Puedes revocarla cuando quieras escribiendo a <strong>{CONTACTO}</strong>, lo que implica
          el cierre de la cuenta salvo una obligación legal de conservación.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="priv-6">
        <h2 id="priv-6">6. Transferencias nacionales e internacionales</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tus recetas y cuenta se guardan en servidores de la demo (Colombia). Al usar la sugerencia
          con IA o las recetas de TheMealDB, ciertos datos viajan a proveedores en el exterior
          (Estados Unidos): estas son <strong>transferencias internacionales</strong> permitidas por
          el artículo 26 de la Ley 1581 solo con tu autorización informada, la cual prestas al
          activar dichas funciones. Nunca transferimos más de lo necesario (tus ingredientes de
          búsqueda, no tu cuenta ni tu contraseña).
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="priv-7">
        <h2 id="priv-7">7. Tus derechos (artículo 13, Ley 1581)</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
          <li>
            <strong>Conocer</strong> qué datos tuyos tratamos y para qué.
          </li>
          <li>
            <strong>Actualizar y rectificar</strong> tus datos (desde Perfil y Ajustes, o por
            correo).
          </li>
          <li>
            <strong>Solicitar prueba</strong> de la autorización otorgada.
          </li>
          <li>
            <strong>Ser informado</strong> del uso dado a tus datos.
          </li>
          <li>
            <strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio
            (SIC), autoridad de protección de datos.
          </li>
          <li>
            <strong>Revocar la autorización</strong> cuando no sea necesario el cumplimiento de una
            obligación legal o contractual.
          </li>
        </ul>
        <p className="mt-2 text-sm text-muted-foreground">
          Ejercerlos es <strong>gratuito</strong>: basta un correo a <strong>{CONTACTO}</strong>{' '}
          describiendo tu solicitud. Además, la información de tu cuenta y recetas siempre está
          disponible en la propia aplicación (exportación a JSON desde Ajustes → Datos).
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="priv-8">
        <h2 id="priv-8">8. Reclamos por protección de datos (artículo 15, Ley 1581)</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
          <li>
            Dirige tu reclamo a <strong>{CONTACTO}</strong>, con tu nombre, descripción clara de los
            datos y tu dirección de notificación.
          </li>
          <li>
            Responderemos en un término máximo de <strong>15 días hábiles</strong> contados desde el
            día siguiente a su recibimiento (prorrogable por 8 días hábiles más si el caso lo
            requiere).
          </li>
          <li>
            Si no quedas conforme, puedes acudir a la <strong>SIC</strong> (www.sic.gov.co) o
            interponer <strong>acción de tutela</strong> (art. 86 CP).
          </li>
        </ul>
      </section>

      <section className="surface-section mt-4" aria-labelledby="priv-9">
        <h2 id="priv-9">9. Derecho de petición (Ley 1755 de 2015)</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Puedes presentar peticiones, quejas, reclamos y solicitudes (PQRSD) por medios
          electrónicos al correo <strong>{CONTACTO}</strong>. Según el artículo 14 de la Ley 1755 de
          2015, las peticiones se resuelven dentro de los <strong>15 días hábiles</strong>{' '}
          siguientes (10 días hábiles cuando se trate de documentos o información). Tu petición
          tendrá las mismas formalidades que una presentada en papel (nombre, identificación, objeto
          de la petición).
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="priv-10">
        <h2 id="priv-10">10. Conservación y eliminación</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
          <li>
            <strong>Cuenta y recetas:</strong> mientras exista tu relación con el servicio y luego
            del cierre, mientras subsista una obligación legal o contractual.
          </li>
          <li>
            <strong>Papelera:</strong> 30 días antes del borrado definitivo (dáselos de baja antes
            si quieres).
          </li>
          <li>
            <strong>Historial de búsqueda:</strong> local en tu navegador; puedes borrarlo desde el
            navegador o Ajustes.
          </li>
          <li>
            <strong>Eliminación total:</strong> la solicitas por correo y la ejecutamos en los
            términos del artículo 15, sin perjuicio de registros de auditoría exigidos por ley.
          </li>
        </ul>
      </section>

      <section className="surface-section mt-4" aria-labelledby="priv-11">
        <h2 id="priv-11">11. Medidas de seguridad</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Aplicamos medidas técnicas y organizacionales acordes con el artículo 17 de la Ley 1581 y
          el principio de seguridad: contraseñas cifradas (bcrypt), tokens JWT con caducidad,
          control de permisos por roles (usuario/administrador), registro de auditoría de
          operaciones críticas, validación de entradas y actualizaciones de seguridad. Ningún
          sistema es infalible; si detectas un incidente, repórtalo a <strong>{CONTACTO}</strong> y
          actuaremos de inmediato.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="priv-12">
        <h2 id="priv-12">12. Almacenamiento local, cookies y tecnologías similares</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          La aplicación usa <strong>almacenamiento local</strong> del navegador (localStorage) para
          tema, accesibilidad, tour de bienvenida y sesión; y <strong>cookies de sesión</strong>{' '}
          solo para mantenerte autenticado.{' '}
          <strong>No usamos cookies de publicidad ni rastreo de terceros</strong>. Puedes
          borrarlas/bloquearlas desde tu navegador sin perder el uso esencial (solo tendrás que
          volver a iniciar sesión).
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="priv-13">
        <h2 id="priv-13">13. Niñas, niños y adolescentes</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          SazónLab no está dirigido específicamente a menores de edad. Conforme al artículo 7 de la
          Ley 1581, el tratamiento de datos de menores requiere la autorización de quien ejerce su
          cuidado personal; si eres padre o madre y quieres que se elimine la cuenta de tu hijo(a),
          escríbenos a <strong>{CONTACTO}</strong>.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="priv-14">
        <h2 id="priv-14">14. Transparencia (Ley 1712 de 2014)</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Por tratarse de un proyecto ligado a una entidad pública (SENA), apoyamos el derecho de
          acceso a la información pública: el código fuente y la documentación del proyecto se
          encuentran bajo licencia MIT y los informes están en el repositorio. Si necesitas
          información pública específica, presenta tu petición por los canales de la Ley 1712 o al
          correo de contacto.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="priv-15">
        <h2 id="priv-15">15. Cambios a esta política</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Podemos actualizar esta política para reflejar cambios legales o del servicio; la fecha
          siempre aparece al inicio y los cambios relevantes se avisarán en la aplicación antes de
          aplicarse. El uso continuo tras el aviso implica la aceptación de la versión vigente.
        </p>
      </section>
    </>
  );
}

export function Terminos() {
  return (
    <>
      <p className="mt-1 text-sm text-muted-foreground">Última actualización: {ACTUALIZACION}</p>

      <section className="surface-section mt-4" aria-labelledby="ter-1">
        <h2 id="ter-1">1. Objeto y aceptación electrónica</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Estos términos regulan el uso de <strong>SazónLab — Recetario Inteligente</strong>, un
          servicio <strong>gratuito</strong> de recetario digital. Tu registro o uso implica la
          aceptación de estos términos y de la Política de Privacidad; conforme a la{' '}
          <strong>Ley 527 de 1999</strong>, los mensajes de datos y las aceptaciones electrónicas
          tienen plena validez legal en Colombia, por lo que esta aceptación te obliga como si fuera
          firmada en papel.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-2">
        <h2 id="ter-2">2. Alcance del servicio</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
          <li>
            SazónLab sugiere recetas a partir de tus ingredientes, te permite crear y organizar tu
            recetario y exportarlo (JSON, imagen, PDF, libro de cocina).
          </li>
          <li>
            Es una herramienta de organización culinaria:{' '}
            <strong>no es asesoría nutricional, médica, alergológica ni profesional</strong> y no
            sustituye el criterio de un profesional.
          </li>
          <li>
            No exigimos pagos: si en el futuro apareciera algún servicio de pago, te lo informaremos
            antes y con claridad (Ley 1480 de 2011).
          </li>
        </ul>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-3">
        <h2 id="ter-3">3. Tu cuenta</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
          <li>
            Debes proporcionar <strong>información veraz</strong> (art. 16, Ley 1480 de 2011:
            derecho a recibir información clara y veraz) y mantener tu contraseña segura.
          </li>
          <li>
            Eres responsable de las actividades que ocurran en tu cuenta; avísanos de cualquier uso
            no autorizado.
          </li>
          <li>
            Puedes cerrar tu cuenta y eliminar tus datos cuando quieras (derechos de la Ley 1581
            descritos en la Política de Privacidad).
          </li>
        </ul>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-4">
        <h2 id="ter-4">4. Uso permitido y prohibido</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Te comprometes a <strong>no</strong>: dañar o saturar el servicio, suplantar a otros
          usuarios, acceder a cuentas ajenas, introducir virus o código malicioso, hacer ingeniería
          inversa del sistema, extraer contenidos de forma masiva ni publicar contenido ilegal,
          ofensivo o infractor de derechos de terceros. El acceso no autorizado a sistemas y datos
          está tipificado como delito por la <strong>Ley 1273 de 2009</strong> y el Código Penal.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-5">
        <h2 id="ter-5">5. Propiedad intelectual</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
          <li>
            <strong>Tus recetas son tuyas.</strong> SazónLab no reclama derecho sobre ellas; nos
            autorizas únicamente a almacenarlas y mostrarlas para prestarte el servicio (Ley 23 de
            1982).
          </li>
          <li>
            <strong>Recetas sugeridas:</strong> provienen de TheMealDB (bajo la licencia de sus
            creadores) o de resultados generados por IA; se ofrecen como inspiración y no te dan
            exclusividad sobre ellas.
          </li>
          <li>
            <strong>El software SazónLab</strong> se distribuye bajo licencia MIT; puedes consultar
            y reutilizar el código respetando la licencia.
          </li>
        </ul>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-6">
        <h2 id="ter-6">6. Aviso sobre contenido generado con IA</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Las sugerencias con inteligencia artificial (OpenAI/Gemini) pueden contener errores,
          cantidades imprecisas, ingredientes inadecuados para alergias o información
          desactualizada.
          <strong> Revisa siempre ingredientes, cantidades y tiempos antes de cocinar</strong>: tú
          eres responsable final de lo que preparas. La IA es una herramienta de inspiración, no una
          autoridad en cocina ni en seguridad alimentaria.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-7">
        <h2 id="ter-7">7. Seguridad alimentaria y alergias</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Las recetas y sugerencias son informativas. Verifica siempre la frescura de los alimentos,
          las temperaturas de cocción y, sobre todo, las <strong>alergias</strong> de quienes
          cocinas: SazónLab no controla ingredientes ni alérgenos de recetas de terceros y no se
          responsabiliza por reacciones alérgicas o intoxicaciones derivadas de un uso sin
          verificación. Ante cualquier duda de salud, consulta a un profesional.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-8">
        <h2 id="ter-8">8. Derechos del consumidor (Ley 1480 de 2011)</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
          <li>
            Como usuario en Colombia eres <strong>consumidor</strong> y tienes los derechos básicos
            del estatuto del consumidor, actualizado por la <strong>Ley 2439 de 2024</strong>.
          </li>
          <li>
            <strong>Información veraz:</strong> todo lo que publicamos (funciones, limitaciones,
            precios —hoy gratuitos—) es claro y veraz.
          </li>
          <li>
            <strong>Reclamos:</strong> puedes reclamar por los canales indicados; si no te
            satisfacemos, acudes a la{' '}
            <strong>Superintendencia de Industria y Comercio (SIC)</strong>.
          </li>
          <li>
            <strong>Derecho de retracto:</strong> en contratos celebrados a distancia aplica un
            término máximo de <strong>5 días hábiles</strong> para retractarse; al ser SazónLab
            gratuito y sin compras, hoy no hay nada que retractar, pero el derecho se reconoce para
            cualquier servicio futuro de pago.
          </li>
          <li>
            Ninguna clálimita de estos términos afecta tus derechos irrenunciables como consumidor
            (art. 51 CP).
          </li>
        </ul>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-9">
        <h2 id="ter-9">9. Servicios de terceros y disponibilidad</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          SazónLab depende de TheMealDB, OpenAI/Gemini y del alojamiento del servidor; no
          controlamos su disponibilidad ni su contenido externo. Trabajamos para mantener el
          servicio operativo al menos el 99% del tiempo (RNF-03) y para ofrecer siempre un mecanismo
          de respaldo (fallback a TheMealDB), pero no garantizamos ausencia total de interrupciones.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-10">
        <h2 id="ter-10">10. Limitación de responsabilidad</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          En la medida en que la ley colombiana lo permita, SazónLab no responde por daños
          indirectos derivados de: recetas de terceros, sugerencias de IA sin verificar, uso
          indebido de la información o indisponibilidad momentánea.{' '}
          <strong>Esta limitación no afecta los derechos irrenunciables del consumidor</strong> ni
          la responsabilidad por negligencia grave o por la vida y la salud, que no pueden
          exonerarse (Ley 1480 de 2011 y Código Civil).
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-11">
        <h2 id="ter-11">11. Protección de datos personales</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          El tratamiento de tus datos personales se describe en la{' '}
          <strong>Política de Privacidad</strong>, elaborada conforme a la Ley 1581 de 2012, el
          Decreto 1377 de 2013 y el Decreto 1074 de 2015. Al aceptar estos términos también aceptas
          dicha política.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-12">
        <h2 id="ter-12">12. Peticiones, quejas y reclamos (Ley 1755 de 2015)</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Presenta tus PQRSD al correo <strong>{CONTACTO}</strong>. Respondemos dentro de los{' '}
          <strong>15 días hábiles</strong> siguientes (10 días hábiles para documentos o
          información), conforme al artículo 14 de la Ley 1755 de 2015. También puedes acudir a la
          SIC o a la acción de tutela (art. 86 CP) si no recibes respuesta o esta no te satisface.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-13">
        <h2 id="ter-13">13. Ley aplicable y jurisdicción</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Estos términos se rigen por las <strong>leyes de la República de Colombia</strong>.
          Cualquier controversia se resolverá ante los tribunales competentes de Colombia,
          respetando el fuero del consumidor (podrás acudir a los juzgados de tu domicilio) y sin
          perjuicio de las facultades de la Superintendencia de Industria y Comercio.
        </p>
      </section>

      <section className="surface-section mt-4" aria-labelledby="ter-14">
        <h2 id="ter-14">14. Modificaciones y vigencia</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Podemos actualizar estos términos para reflejar cambios legales o del servicio; la fecha
          siempre aparece al inicio y los cambios relevantes se avisarán antes de aplicarse. Seguir
          usando SazónLab después de un cambio implica aceptarlo.
        </p>
      </section>
    </>
  );
}
