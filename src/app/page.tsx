import Image from "next/image";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";

import { db, schema } from "@/db/client";

type TopAlbum = {
  id: string;
  title: string;
  slug: string;
  coverUrl: string | null;
  avgRating: string | null;
  ratingCount: number;
  releaseYear: number | null;
  artistName: string;
};

async function loadTopAlbums(): Promise<TopAlbum[]> {
  if (!db) return [];
  const rows = await db
    .select({
      id: schema.albums.id,
      title: schema.albums.title,
      slug: schema.albums.slug,
      coverUrl: schema.albums.coverUrl,
      avgRating: schema.albums.avgRating,
      ratingCount: schema.albums.ratingCount,
      releaseYear: schema.albums.releaseYear,
      artistName: schema.artists.name,
    })
    .from(schema.albums)
    .innerJoin(schema.artists, eq(schema.albums.artistId, schema.artists.id))
    .orderBy(
      sql`${schema.albums.avgRating} DESC NULLS LAST`,
      desc(schema.albums.ratingCount),
      desc(schema.albums.createdAt),
    )
    .limit(9);
  return rows;
}

async function loadStats(): Promise<{ albums: number; votes: number }> {
  if (!db) return { albums: 0, votes: 0 };
  const [[a], [v]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.albums),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.ratings),
  ]);
  return { albums: a?.n ?? 0, votes: v?.n ?? 0 };
}

function fmt(avg: string | null): string {
  return avg ? Number(avg).toFixed(1) : "—";
}

export default async function Home() {
  const [top, stats] = await Promise.all([loadTopAlbums(), loadStats()]);
  const featured = top[0] ?? null;
  const rest = top.slice(1);

  const statItems = [
    { value: stats.albums.toLocaleString("es-ES"), label: "Álbumes" },
    { value: stats.votes.toLocaleString("es-ES"), label: "Votos emitidos" },
    { value: "1 – 10", label: "Escala · pasos de 0.5" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-20 px-5 py-14 sm:px-8 sm:py-20">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="grid items-stretch gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-rise flex flex-col justify-center gap-7">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-terra" />
            Fase 2 · Beta privada
          </span>

          <h1 className="font-display text-5xl font-bold leading-[1.0] tracking-tight text-ink sm:text-7xl">
            Música,
            <br />
            calificada{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-[-0.08em] bottom-[0.08em] -z-10 h-[0.42em] -rotate-1 bg-lemon"
              />
              en&nbsp;vivo.
            </span>
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-ink-soft">
            La sala de redacción para tu canal de reacciones. Cambia el Excel por
            rankings que se actualizan en cada voto, notas del 1 al 10 con medios
            puntos y un histórico público que cualquiera puede recorrer.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/rankings"
              className="inline-flex h-12 items-center justify-center rounded-full bg-terra px-7 text-sm font-semibold text-paper shadow-[0_3px_0_0_var(--color-terra-deep)] transition hover:-translate-y-0.5 hover:bg-terra-deep"
            >
              Ver Top Álbumes
            </Link>
            <Link
              href="/live"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line-strong bg-surface px-7 text-sm font-semibold text-ink transition hover:border-terra/40 hover:text-terra-deep"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-terra" />
              Pantalla en vivo
            </Link>
          </div>

          <dl className="mt-2 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
            {statItems.map((s) => (
              <div key={s.label} className="flex flex-col">
                <dt className="order-2 text-xs font-medium uppercase tracking-wider text-muted">
                  {s.label}
                </dt>
                <dd className="nums order-1 font-display text-3xl font-semibold text-ink">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Featured #1 album */}
        <div className="animate-rise [animation-delay:120ms]">
          <FeaturedAlbum album={featured} />
        </div>
      </section>

      {/* ── Top álbumes ──────────────────────────────────────── */}
      <section className="animate-rise flex flex-col gap-7 [animation-delay:200ms]">
        <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-terra">
              Lo mejor calificado
            </span>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
              Top álbumes
            </h2>
          </div>
          <Link
            href="/rankings"
            className="shrink-0 text-sm font-semibold text-ink-soft transition hover:text-terra-deep"
          >
            Ranking completo →
          </Link>
        </div>

        {rest.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center text-sm text-ink-soft">
            {featured
              ? "El podio se está formando. Pronto habrá más álbumes calificados."
              : "Aún no hay álbumes calificados. Vuelve pronto."}
          </div>
        ) : (
          <ol className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {rest.map((a, i) => (
              <li key={a.id}>
                <AlbumCard album={a} rank={i + 2} />
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── Cómo funciona ────────────────────────────────────── */}
      <section className="animate-rise grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-3 [animation-delay:280ms]">
        {[
          {
            n: "01",
            title: "Reacciona y vota",
            body: "Cada track recibe una nota del 1 al 10 con medios puntos. Sin hojas de cálculo.",
          },
          {
            n: "02",
            title: "El ranking se mueve",
            body: "Los promedios se recalculan al instante y reordenan el Top en vivo.",
          },
          {
            n: "03",
            title: "Queda en la historia",
            body: "Hall of Fame, Hall of Shame y un histórico público navegable por año.",
          },
        ].map((step) => (
          <div key={step.n} className="flex flex-col gap-3 bg-surface p-7">
            <span className="nums font-display text-2xl font-semibold text-terra">
              {step.n}
            </span>
            <h3 className="text-base font-semibold text-ink">{step.title}</h3>
            <p className="text-sm leading-relaxed text-ink-soft">{step.body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-auto flex flex-col gap-2 border-t border-line pt-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <span className="font-display text-sm font-semibold text-ink-soft">
          BeatBoard
        </span>
        <span>v0.1.0 · Next.js · Supabase · Drizzle</span>
      </footer>
    </main>
  );
}

function FeaturedAlbum({ album }: { album: TopAlbum | null }) {
  if (!album) {
    return (
      <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-line-strong bg-surface/60 p-10 text-center">
        <span className="font-display text-5xl text-line-strong">♪</span>
        <p className="text-sm text-ink-soft">
          Aún no hay un álbum destacado.
          <br />
          Califica el primero para encender el podio.
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`/albums/${album.slug}`}
      className="group relative flex h-full min-h-[22rem] flex-col justify-end overflow-hidden rounded-3xl border border-ink/15 bg-ink shadow-[0_24px_60px_-30px_rgba(4,4,21,0.65)]"
    >
      {album.coverUrl ? (
        <Image
          src={album.coverUrl}
          alt={`Portada de ${album.title}`}
          fill
          sizes="(min-width: 1024px) 44vw, 100vw"
          className="object-cover transition duration-700 group-hover:scale-105"
          unoptimized
          priority
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-7xl text-white/20">
          ♪
        </div>
      )}

      {/* Dark legibility gradient */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,4,21,0.10)0%,rgba(4,4,21,0.55)52%,rgba(4,4,21,0.95)100%)]" />

      <div className="relative flex flex-col gap-3 p-6 sm:p-8">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-lemon px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-ink ring-1 ring-inset ring-ink/10">
          ★ #1 · Mejor calificado
        </span>

        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              <span className="line-clamp-2">{album.title}</span>
            </h3>
            <p className="mt-1 truncate text-sm font-medium text-white/80">
              {album.artistName}
              {album.releaseYear ? (
                <span className="text-white/50"> · {album.releaseYear}</span>
              ) : null}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-center rounded-2xl bg-white px-4 py-2 text-center shadow-lg">
            <span className="nums font-display text-3xl font-bold leading-none text-terra-deep">
              {fmt(album.avgRating)}
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-ink-soft">
              {album.ratingCount} voto{album.ratingCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function AlbumCard({ album, rank }: { album: TopAlbum; rank: number }) {
  return (
    <Link href={`/albums/${album.slug}`} className="group flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-surface-soft shadow-sm transition group-hover:shadow-md">
        {album.coverUrl ? (
          <Image
            src={album.coverUrl}
            alt={`Portada de ${album.title}`}
            width={320}
            height={320}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-line-strong">
            ♪
          </div>
        )}
        <span className="nums absolute left-2.5 top-2.5 inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-paper/90 px-2 font-display text-sm font-semibold text-terra-deep ring-1 ring-inset ring-line backdrop-blur-sm">
          {rank}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="truncate text-sm font-semibold text-ink transition group-hover:text-terra-deep">
          {album.title}
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-ink-soft">{album.artistName}</p>
          <span className="nums shrink-0 font-display text-sm font-semibold text-terra">
            {fmt(album.avgRating)}
          </span>
        </div>
      </div>
    </Link>
  );
}
