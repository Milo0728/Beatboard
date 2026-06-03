import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-16 px-6 py-24 sm:px-10">
        <section className="flex flex-col gap-8">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs font-medium text-zinc-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Construyendo el MVP — Fase 1
          </div>

          <h1 className="text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl">
            Música, calificada
            <br />
            <span className="bg-gradient-to-r from-fuchsia-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              en vivo.
            </span>
          </h1>

          <p className="max-w-2xl text-lg text-zinc-400 sm:text-xl">
            Plataforma de votación y crítica musical para canales de reacciones.
            Reemplaza Excel por rankings dinámicos, calificaciones del 1 al 10 con
            decimales de 0.5 y un histórico público navegable.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/rankings"
              className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-100 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-white"
            >
              Ver Top Álbumes
            </Link>
            <Link
              href="/live"
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 px-6 text-sm font-semibold text-zinc-100 transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              Pantalla en vivo
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Calificación 1–10",
              body: "Paso de 0.5, validado en frontend, API y restricciones de base de datos.",
            },
            {
              title: "Rankings en tiempo real",
              body: "Promedios actualizados al instante vía WebSockets para audiencia y overlay OBS.",
            },
            {
              title: "Histórico público",
              body: "Cada álbum tiene URL permanente con tracklist, notas y reseñas escritas.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <h3 className="font-semibold text-zinc-100">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{f.body}</p>
            </div>
          ))}
        </section>

        <footer className="mt-auto border-t border-zinc-900 pt-6 text-xs text-zinc-500">
          BeatBoard — v0.1.0 · Next.js + Supabase + Drizzle
        </footer>
      </main>
    </div>
  );
}
