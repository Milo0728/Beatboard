export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-5 py-24">
      <div className="flex flex-col items-center gap-4">
        <span
          aria-hidden
          className="h-10 w-10 animate-spin rounded-full border-[3px] border-line-strong border-t-terra"
        />
        <span className="text-sm font-medium text-muted">Cargando…</span>
      </div>
    </main>
  );
}
