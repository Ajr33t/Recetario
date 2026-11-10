/** Enlace "Saltar al contenido" (WCAG 2.4.1) — primer elemento con foco de la página. */
export default function SkipLink() {
  return (
    <a href="#contenido-principal" className="skip-link">
      <i className="fa-solid fa-arrow-down" aria-hidden="true" /> Saltar al contenido principal
    </a>
  );
}
