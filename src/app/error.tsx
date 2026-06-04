"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-5 py-24 text-center">
      <span
        aria-hidden
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-clay-tint font-display text-3xl font-bold text-clay"
      >
        !
      </span>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
        Algo salió mal
      </h1>
      <p className="max-w-md text-ink-soft">
        Ocurrió un error inesperado. Puedes reintentar; si el problema persiste,
        vuelve más tarde.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted">Código: {error.digest}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center justify-center rounded-full bg-terra px-6 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-surface px-6 text-sm font-semibold text-ink transition hover:border-terra/40 hover:text-terra-deep"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
