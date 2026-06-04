import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-5 py-24 text-center">
      <span className="font-display text-8xl font-extrabold leading-none text-terra">
        404
      </span>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
        Página no encontrada
      </h1>
      <p className="max-w-md text-ink-soft">
        La página que buscas no existe o se movió. Puede que el álbum o el artista
        ya no esté en el catálogo.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-full bg-terra px-6 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep"
        >
          Volver al inicio
        </Link>
        <Link
          href="/albums"
          className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-surface px-6 text-sm font-semibold text-ink transition hover:border-terra/40 hover:text-terra-deep"
        >
          Ver catálogo
        </Link>
      </div>
    </main>
  );
}
