/** Favoritos (RF-09 — se implementa en la Fase 5). */
export default function Favoritos() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1>Favoritos</h1>
        <p className="mt-1 text-muted-foreground">Tus recetas guardadas, siempre a mano.</p>
      </header>

      <div className="glass-card flex flex-col items-center gap-2 py-10 text-center">
        <i className="fa-solid fa-heart text-4xl text-primary" aria-hidden="true" />
        <p className="font-medium">Aún no tienes favoritos</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Marca el corazón ❤️ de cualquier receta para guardarla aquí. La gestión de favoritos se
          activa en la Fase 5.
        </p>
      </div>
    </div>
  );
}
