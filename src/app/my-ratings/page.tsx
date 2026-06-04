import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import { db, schema } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { formatDuration } from "@/lib/validators/album";

export const metadata: Metadata = {
  title: "Mis calificaciones — BeatBoard",
  description: "Histórico de canciones que has calificado en BeatBoard.",
};

type Row = {
  ratingId: string;
  score: string;
  ratedAt: Date;
  songId: string;
  songTitle: string;
  songNumber: number;
  songDuration: number | null;
  songAvg: string | null;
  albumId: string;
  albumTitle: string;
  albumSlug: string;
  albumCover: string | null;
  albumYear: number;
  artistName: string;
};

type AlbumGroup = {
  albumId: string;
  albumTitle: string;
  albumSlug: string;
  albumCover: string | null;
  albumYear: number;
  artistName: string;
  latestRatedAt: Date;
  songs: Row[];
};

function groupByAlbum(rows: Row[]): AlbumGroup[] {
  const map = new Map<string, AlbumGroup>();
  for (const r of rows) {
    const existing = map.get(r.albumId);
    if (existing) {
      existing.songs.push(r);
      if (r.ratedAt > existing.latestRatedAt) {
        existing.latestRatedAt = r.ratedAt;
      }
    } else {
      map.set(r.albumId, {
        albumId: r.albumId,
        albumTitle: r.albumTitle,
        albumSlug: r.albumSlug,
        albumCover: r.albumCover,
        albumYear: r.albumYear,
        artistName: r.artistName,
        latestRatedAt: r.ratedAt,
        songs: [r],
      });
    }
  }

  const groups = Array.from(map.values());
  // Preserve recency ordering: most recently rated album first.
  groups.sort((a, b) => b.latestRatedAt.getTime() - a.latestRatedAt.getTime());
  // Inside each album, list songs by track number for readability.
  for (const g of groups) {
    g.songs.sort((a, b) => a.songNumber - b.songNumber);
  }
  return groups;
}

type Stats = {
  total: number;
  average: number;
  highest: { score: number; title: string } | null;
  lowest: { score: number; title: string } | null;
};

function computeStats(rows: Row[]): Stats {
  if (rows.length === 0) {
    return { total: 0, average: 0, highest: null, lowest: null };
  }
  let sum = 0;
  let highest: { score: number; title: string } | null = null;
  let lowest: { score: number; title: string } | null = null;
  for (const r of rows) {
    const score = Number(r.score);
    sum += score;
    if (!highest || score > highest.score) {
      highest = { score, title: r.songTitle };
    }
    if (!lowest || score < lowest.score) {
      lowest = { score, title: r.songTitle };
    }
  }
  return {
    total: rows.length,
    average: sum / rows.length,
    highest,
    lowest,
  };
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface-soft p-4">
      <span className="text-[10px] uppercase tracking-widest text-muted">
        {label}
      </span>
      <span className="nums font-display text-2xl font-semibold text-terra">
        {value}
      </span>
      {hint ? (
        <span className="truncate text-xs text-ink-soft" title={hint}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export default async function MyRatingsPage() {
  const current = await getCurrentUser();

  if (!current) {
    redirect("/login?next=/my-ratings");
  }

  if (!current.profile) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-12 sm:px-8">
        <header className="flex flex-col gap-3">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted hover:text-terra-deep"
          >
            ← Inicio
          </Link>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Mis calificaciones
          </h1>
        </header>
        <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm text-ink-soft">
            Necesitas{" "}
            <Link
              href="/login?next=/my-ratings"
              className="font-semibold text-terra hover:text-terra-deep"
            >
              iniciar sesión
            </Link>{" "}
            para ver tu histórico.
          </p>
        </div>
      </div>
    );
  }

  const rows: Row[] = db
    ? await db
        .select({
          ratingId: schema.ratings.id,
          score: schema.ratings.score,
          ratedAt: schema.ratings.updatedAt,
          songId: schema.songs.id,
          songTitle: schema.songs.title,
          songNumber: schema.songs.trackNumber,
          songDuration: schema.songs.durationSeconds,
          songAvg: schema.songs.avgRating,
          albumId: schema.albums.id,
          albumTitle: schema.albums.title,
          albumSlug: schema.albums.slug,
          albumCover: schema.albums.coverUrl,
          albumYear: schema.albums.releaseYear,
          artistName: schema.artists.name,
        })
        .from(schema.ratings)
        .innerJoin(schema.songs, eq(schema.ratings.songId, schema.songs.id))
        .innerJoin(schema.albums, eq(schema.songs.albumId, schema.albums.id))
        .innerJoin(schema.artists, eq(schema.albums.artistId, schema.artists.id))
        .where(
          and(
            eq(schema.ratings.userId, current.profile.id),
            eq(schema.ratings.ratingType, "song"),
          ),
        )
        .orderBy(desc(schema.ratings.updatedAt))
        .limit(500)
    : [];

  const stats = computeStats(rows);
  const groups = groupByAlbum(rows);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-12 sm:px-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/"
          className="text-xs uppercase tracking-widest text-muted hover:text-terra-deep"
        >
          ← Inicio
        </Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Mis calificaciones
        </h1>
        <p className="max-w-2xl text-sm text-ink-soft">
          Histórico de todo lo que has puntuado.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm text-ink-soft">Aún no has calificado nada.</p>
          <p className="text-sm text-ink-soft">
            Explora la discoteca y empieza a dejar tu puntuación en cada canción.
          </p>
          <Link
            href="/albums"
            className="inline-flex h-10 items-center rounded-full bg-terra px-4 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep"
          >
            Ver álbumes
          </Link>
        </div>
      ) : (
        <>
          <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 className="text-xs uppercase tracking-widest text-muted">
                Resumen
              </h2>
              <span className="text-xs text-muted">
                {groups.length} álbum{groups.length === 1 ? "" : "es"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Total"
                value={String(stats.total)}
                hint={`canción${stats.total === 1 ? "" : "es"} calificada${
                  stats.total === 1 ? "" : "s"
                }`}
              />
              <StatCard
                label="Promedio"
                value={stats.average.toFixed(1)}
                hint="tu media"
              />
              <StatCard
                label="Más alta"
                value={stats.highest ? stats.highest.score.toFixed(1) : "—"}
                hint={stats.highest?.title}
              />
              <StatCard
                label="Más baja"
                value={stats.lowest ? stats.lowest.score.toFixed(1) : "—"}
                hint={stats.lowest?.title}
              />
            </div>
          </section>

          <section className="flex flex-col gap-5">
            {groups.map((group) => (
              <article
                key={group.albumId}
                className="rounded-3xl border border-line bg-surface p-5 shadow-sm"
              >
                <header className="flex items-start gap-4">
                  <Link
                    href={`/albums/${group.albumSlug}`}
                    className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-soft"
                  >
                    {group.albumCover ? (
                      <Image
                        src={group.albumCover}
                        alt={group.albumTitle}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-line-strong">♪</span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/albums/${group.albumSlug}`}
                      className="block truncate text-lg font-semibold text-ink transition hover:text-terra-deep"
                    >
                      {group.albumTitle}
                    </Link>
                    <p className="truncate text-sm text-ink-soft">
                      {group.artistName}
                      <span className="text-muted"> · </span>
                      {group.albumYear}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">
                      {group.songs.length} canción
                      {group.songs.length === 1 ? "" : "es"} calificada
                      {group.songs.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </header>

                <ul className="mt-4 divide-y divide-line border-t border-line">
                  {group.songs.map((song) => {
                    const score = Number(song.score);
                    const avg = song.songAvg != null ? Number(song.songAvg) : null;
                    return (
                      <li
                        key={song.ratingId}
                        className="flex items-center gap-4 py-3"
                      >
                        <span className="nums w-8 shrink-0 text-right text-xs text-muted">
                          {song.songNumber.toString().padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">
                            {song.songTitle}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {formatDuration(song.songDuration)}
                            <span className="text-line-strong"> · </span>
                            Media:{" "}
                            <span className="nums text-ink-soft">
                              {avg != null ? avg.toFixed(1) : "—"}
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="nums font-display text-2xl font-semibold text-terra">
                            {score.toFixed(1)}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-muted">
                            tu nota
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
