import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { and, desc, eq, gt, gte, isNotNull, lte, sql } from "drizzle-orm";

import { db, schema } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Rankings — BeatBoard",
  description:
    "Top 50 álbumes y canciones calificados por la audiencia de BeatBoard.",
};

type Tab = "albums" | "songs" | "hall-of-fame" | "hall-of-shame";

type SearchParams = Promise<{ tab?: string; year?: string }>;

type AlbumRow = {
  id: string;
  title: string;
  slug: string;
  releaseYear: number;
  coverUrl: string | null;
  avgRating: string | null;
  ratingCount: number;
  manualAvgRating: string | null;
  manualRatingCount: number;
  artistName: string;
  artistSlug: string;
};

type SongRow = {
  id: string;
  title: string;
  avgRating: string | null;
  ratingCount: number;
  albumTitle: string;
  albumSlug: string;
  artistName: string;
};

async function loadAlbums(year: number | null): Promise<AlbumRow[]> {
  if (!db) return [];
  const baseQuery = db
    .select({
      id: schema.albums.id,
      title: schema.albums.title,
      slug: schema.albums.slug,
      releaseYear: schema.albums.releaseYear,
      coverUrl: schema.albums.coverUrl,
      avgRating: schema.albums.avgRating,
      ratingCount: schema.albums.ratingCount,
      manualAvgRating: schema.albums.manualAvgRating,
      manualRatingCount: schema.albums.manualRatingCount,
      artistName: schema.artists.name,
      artistSlug: schema.artists.slug,
    })
    .from(schema.albums)
    .innerJoin(schema.artists, eq(schema.albums.artistId, schema.artists.id));

  const rows =
    year !== null
      ? await baseQuery
          .where(eq(schema.albums.releaseYear, year))
          .orderBy(
            sql`${schema.albums.avgRating} DESC NULLS LAST`,
            desc(schema.albums.ratingCount),
            desc(schema.albums.createdAt),
          )
          .limit(50)
      : await baseQuery
          .orderBy(
            sql`${schema.albums.avgRating} DESC NULLS LAST`,
            desc(schema.albums.ratingCount),
            desc(schema.albums.createdAt),
          )
          .limit(50);

  return rows;
}

async function loadHallOfFame(): Promise<AlbumRow[]> {
  if (!db) return [];
  const rows = await db
    .select({
      id: schema.albums.id,
      title: schema.albums.title,
      slug: schema.albums.slug,
      releaseYear: schema.albums.releaseYear,
      coverUrl: schema.albums.coverUrl,
      avgRating: schema.albums.avgRating,
      ratingCount: schema.albums.ratingCount,
      manualAvgRating: schema.albums.manualAvgRating,
      manualRatingCount: schema.albums.manualRatingCount,
      artistName: schema.artists.name,
      artistSlug: schema.artists.slug,
    })
    .from(schema.albums)
    .innerJoin(schema.artists, eq(schema.albums.artistId, schema.artists.id))
    .where(
      and(
        gte(schema.albums.avgRating, "9.0"),
        gt(schema.albums.ratingCount, 0),
      ),
    )
    .orderBy(
      sql`${schema.albums.avgRating} DESC NULLS LAST`,
      desc(schema.albums.ratingCount),
      desc(schema.albums.createdAt),
    )
    .limit(50);

  return rows;
}

async function loadHallOfShame(): Promise<AlbumRow[]> {
  if (!db) return [];
  const rows = await db
    .select({
      id: schema.albums.id,
      title: schema.albums.title,
      slug: schema.albums.slug,
      releaseYear: schema.albums.releaseYear,
      coverUrl: schema.albums.coverUrl,
      avgRating: schema.albums.avgRating,
      ratingCount: schema.albums.ratingCount,
      manualAvgRating: schema.albums.manualAvgRating,
      manualRatingCount: schema.albums.manualRatingCount,
      artistName: schema.artists.name,
      artistSlug: schema.artists.slug,
    })
    .from(schema.albums)
    .innerJoin(schema.artists, eq(schema.albums.artistId, schema.artists.id))
    .where(
      and(
        isNotNull(schema.albums.avgRating),
        lte(schema.albums.avgRating, "3.0"),
        gt(schema.albums.ratingCount, 0),
      ),
    )
    .orderBy(
      sql`${schema.albums.avgRating} ASC NULLS LAST`,
      desc(schema.albums.ratingCount),
      desc(schema.albums.createdAt),
    )
    .limit(50);

  return rows;
}

async function loadSongs(): Promise<SongRow[]> {
  if (!db) return [];
  const rows = await db
    .select({
      id: schema.songs.id,
      title: schema.songs.title,
      avgRating: schema.songs.avgRating,
      ratingCount: schema.songs.ratingCount,
      albumTitle: schema.albums.title,
      albumSlug: schema.albums.slug,
      artistName: schema.artists.name,
    })
    .from(schema.songs)
    .innerJoin(schema.albums, eq(schema.songs.albumId, schema.albums.id))
    .innerJoin(schema.artists, eq(schema.albums.artistId, schema.artists.id))
    .orderBy(
      sql`${schema.songs.avgRating} DESC NULLS LAST`,
      desc(schema.songs.ratingCount),
    )
    .limit(50);

  return rows;
}

async function loadYears(): Promise<number[]> {
  if (!db) return [];
  const rows = await db
    .selectDistinct({ year: schema.albums.releaseYear })
    .from(schema.albums)
    .where(isNotNull(schema.albums.releaseYear))
    .orderBy(desc(schema.albums.releaseYear));
  return rows.map((r) => r.year).filter((y): y is number => typeof y === "number");
}

function RatingBadge({
  avg,
  tone = "default",
}: {
  avg: string | null;
  tone?: "default" | "fame" | "shame";
}) {
  if (!avg) {
    return <span className="nums font-display text-lg font-semibold text-muted">—</span>;
  }
  const toneCls =
    tone === "fame"
      ? "text-gold"
      : tone === "shame"
        ? "text-clay"
        : "text-terra";
  return (
    <span className={`nums font-display text-lg font-semibold ${toneCls}`}>
      {Number(avg).toFixed(1)}
    </span>
  );
}

function TabsNav({ active, year }: { active: Tab; year: number | null }) {
  const albumsHref =
    year !== null ? `/rankings?tab=albums&year=${year}` : "/rankings?tab=albums";
  const songsHref = "/rankings?tab=songs";
  const fameHref = "/rankings?tab=hall-of-fame";
  const shameHref = "/rankings?tab=hall-of-shame";

  const base =
    "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition";
  const activeCls =
    "bg-terra text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] hover:bg-terra-deep";
  const inactiveCls =
    "border border-line-strong bg-surface text-ink-soft hover:border-terra/40 hover:text-terra-deep";
  const fameActiveCls =
    "bg-gold-tint text-gold ring-1 ring-inset ring-gold/30 hover:brightness-[0.98]";
  const shameActiveCls =
    "bg-clay-tint text-clay ring-1 ring-inset ring-clay/30 hover:brightness-[0.98]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={albumsHref}
        className={`${base} ${active === "albums" ? activeCls : inactiveCls}`}
      >
        Álbumes
      </Link>
      <Link
        href={songsHref}
        className={`${base} ${active === "songs" ? activeCls : inactiveCls}`}
      >
        Canciones
      </Link>
      <Link
        href={fameHref}
        className={`${base} ${
          active === "hall-of-fame" ? fameActiveCls : inactiveCls
        }`}
      >
        <span aria-hidden>★</span>
        Hall of Fame
      </Link>
      <Link
        href={shameHref}
        className={`${base} ${
          active === "hall-of-shame" ? shameActiveCls : inactiveCls
        }`}
      >
        <span aria-hidden>▼</span>
        Hall of Shame
      </Link>
    </div>
  );
}

function YearFilter({
  years,
  current,
}: {
  years: number[];
  current: number | null;
}) {
  if (years.length === 0) return null;
  return (
    <form method="get" className="flex items-center gap-2">
      <input type="hidden" name="tab" value="albums" />
      <label htmlFor="year" className="text-xs uppercase tracking-wider text-muted">
        Año
      </label>
      <select
        id="year"
        name="year"
        defaultValue={current ?? ""}
        className="h-10 rounded-full border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus:border-terra"
      >
        <option value="">Todos</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex h-10 items-center rounded-full bg-terra px-4 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep"
      >
        Filtrar
      </button>
      {current !== null ? (
        <Link
          href="/rankings?tab=albums"
          className="text-xs text-muted hover:text-terra-deep"
        >
          Limpiar
        </Link>
      ) : null}
    </form>
  );
}

function EmptyState({
  message,
  canCreate,
}: {
  message: string;
  canCreate: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-2xl ring-1 ring-line">
        🎵
      </div>
      <p className="text-sm text-ink-soft">{message}</p>
      {canCreate ? (
        <Link
          href="/admin/albums/new"
          className="inline-flex h-10 items-center rounded-full bg-terra px-4 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] hover:bg-terra-deep"
        >
          + Crear primer álbum
        </Link>
      ) : null}
    </div>
  );
}

function AlbumList({
  rows,
  tone,
}: {
  rows: AlbumRow[];
  tone: "default" | "fame" | "shame";
}) {
  const badge =
    tone === "fame"
      ? { icon: "★", cls: "bg-gold-tint text-gold ring-gold/30" }
      : tone === "shame"
        ? { icon: "▼", cls: "bg-clay-tint text-clay ring-clay/30" }
        : null;

  return (
    <ol className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
      {rows.map((a, i) => (
        <li
          key={a.id}
          className="flex items-center gap-4 border-b border-line px-4 py-3 transition last:border-b-0 hover:bg-surface-soft"
        >
          <span className="nums w-8 shrink-0 text-right font-display text-lg font-semibold text-muted">
            {i + 1}
          </span>
          <Link
            href={`/albums/${a.slug}`}
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-soft"
          >
            {a.coverUrl ? (
              <Image
                src={a.coverUrl}
                alt=""
                width={48}
                height={48}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-line-strong">♪</span>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/albums/${a.slug}`}
              className="block truncate text-sm font-semibold text-ink transition hover:text-terra-deep"
            >
              {a.title}
            </Link>
            <p className="truncate text-xs text-ink-soft">
              <Link
                href={`/artists/${a.artistSlug}`}
                className="transition hover:text-terra-deep"
              >
                {a.artistName}
              </Link>
              <span className="text-muted"> · </span>
              {a.releaseYear}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1.5">
              {badge ? (
                <span
                  aria-hidden
                  className={`inline-flex h-5 items-center rounded-md px-1.5 text-[10px] font-bold ring-1 ring-inset ${badge.cls}`}
                >
                  {badge.icon}
                </span>
              ) : null}
              <RatingBadge avg={a.avgRating} tone={tone} />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted">
              {a.ratingCount} voto{a.ratingCount === 1 ? "" : "s"}
            </span>
            {a.manualRatingCount > 0 && a.manualAvgRating ? (
              <span
                className="nums text-[10px] font-semibold text-gold"
                title={`Nota global de la audiencia (${a.manualRatingCount} voto${a.manualRatingCount === 1 ? "" : "s"})`}
              >
                audiencia {Number(a.manualAvgRating).toFixed(1)}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tab: Tab =
    params.tab === "songs"
      ? "songs"
      : params.tab === "hall-of-fame"
        ? "hall-of-fame"
        : params.tab === "hall-of-shame"
          ? "hall-of-shame"
          : "albums";
  const yearRaw = params.year;
  const yearParsed =
    yearRaw && /^\d+$/.test(yearRaw) ? Number.parseInt(yearRaw, 10) : NaN;
  const year = Number.isFinite(yearParsed) ? yearParsed : null;

  const current = await getCurrentUser();
  const canCreate =
    current?.profile != null &&
    ["admin", "host"].includes(current.profile.role);

  const [albums, songs, years, fame, shame] = await Promise.all([
    tab === "albums" ? loadAlbums(year) : Promise.resolve<AlbumRow[]>([]),
    tab === "songs" ? loadSongs() : Promise.resolve<SongRow[]>([]),
    tab === "albums" ? loadYears() : Promise.resolve<number[]>([]),
    tab === "hall-of-fame" ? loadHallOfFame() : Promise.resolve<AlbumRow[]>([]),
    tab === "hall-of-shame" ? loadHallOfShame() : Promise.resolve<AlbumRow[]>([]),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-12 sm:px-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terra">
          Rankings
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Lo mejor calificado
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
          Top 50 ordenado por promedio y volumen de votos. Se actualiza en cada
          calificación.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TabsNav active={tab} year={year} />
        {tab === "albums" ? <YearFilter years={years} current={year} /> : null}
      </div>

      {tab === "albums" ? (
        albums.length === 0 ? (
          <EmptyState
            message={
              year !== null
                ? `Aún no hay álbumes calificados del año ${year}.`
                : "Aún no hay álbumes en el ranking."
            }
            canCreate={canCreate}
          />
        ) : (
          <AlbumList rows={albums} tone="default" />
        )
      ) : tab === "hall-of-fame" ? (
        fame.length === 0 ? (
          <EmptyState
            message="Aún no hay álbumes con calificación ≥ 9.0."
            canCreate={false}
          />
        ) : (
          <AlbumList rows={fame} tone="fame" />
        )
      ) : tab === "hall-of-shame" ? (
        shame.length === 0 ? (
          <EmptyState
            message="No hay álbumes en el Hall of Shame. ¡Mejor así!"
            canCreate={false}
          />
        ) : (
          <AlbumList rows={shame} tone="shame" />
        )
      ) : songs.length === 0 ? (
        <EmptyState
          message="Aún no hay canciones calificadas."
          canCreate={canCreate}
        />
      ) : (
        <ol className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
          {songs.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center gap-4 border-b border-line px-4 py-3 transition last:border-b-0 hover:bg-surface-soft"
            >
              <span className="nums w-8 shrink-0 text-right font-display text-lg font-semibold text-muted">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {s.title}
                </p>
                <p className="truncate text-xs text-ink-soft">
                  <Link
                    href={`/albums/${s.albumSlug}`}
                    className="transition hover:text-terra-deep"
                  >
                    {s.albumTitle}
                  </Link>
                  <span className="text-muted"> · </span>
                  {s.artistName}
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <RatingBadge avg={s.avgRating} />
                <span className="text-[10px] uppercase tracking-wider text-muted">
                  {s.ratingCount} voto{s.ratingCount === 1 ? "" : "s"}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
