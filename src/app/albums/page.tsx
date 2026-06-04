import Image from "next/image";
import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { db, schema } from "@/db/client";

export const metadata = { title: "Álbumes — BeatBoard" };

type SearchParams = Promise<{
  q?: string;
  genre?: string;
  year?: string;
  page?: string;
}>;

type AlbumFilters = { q?: string; genre?: string; year?: number };

const PAGE_SIZE = 24;

function buildAlbumWhere(filters: AlbumFilters): SQL | undefined {
  const conditions: SQL[] = [];

  if (filters.q && filters.q.trim().length > 0) {
    const term = `%${filters.q.trim()}%`;
    const titleOrArtist = or(
      ilike(schema.albums.title, term),
      ilike(schema.artists.name, term),
    );
    if (titleOrArtist) conditions.push(titleOrArtist);
  }

  if (filters.genre && filters.genre !== "") {
    conditions.push(sql`${schema.albums.genres} @> ARRAY[${filters.genre}]::text[]`);
  }

  if (filters.year && Number.isFinite(filters.year)) {
    conditions.push(eq(schema.albums.releaseYear, filters.year));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

async function loadAlbums(filters: AlbumFilters, page: number) {
  if (!db) return [];

  return db
    .select({
      id: schema.albums.id,
      title: schema.albums.title,
      slug: schema.albums.slug,
      coverUrl: schema.albums.coverUrl,
      releaseYear: schema.albums.releaseYear,
      avgRating: schema.albums.avgRating,
      ratingCount: schema.albums.ratingCount,
      artistName: schema.artists.name,
    })
    .from(schema.albums)
    .innerJoin(schema.artists, eq(schema.albums.artistId, schema.artists.id))
    .where(buildAlbumWhere(filters))
    .orderBy(desc(schema.albums.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
}

async function countAlbums(filters: AlbumFilters): Promise<number> {
  if (!db) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.albums)
    .innerJoin(schema.artists, eq(schema.albums.artistId, schema.artists.id))
    .where(buildAlbumWhere(filters));
  return row?.n ?? 0;
}

function pageHref(page: number, filters: AlbumFilters): string {
  const sp = new URLSearchParams();
  if (filters.q) sp.set("q", filters.q);
  if (filters.genre) sp.set("genre", filters.genre);
  if (filters.year) sp.set("year", String(filters.year));
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `/albums?${qs}` : "/albums";
}

async function loadFilterOptions() {
  if (!db) return { genres: [] as string[], years: [] as number[] };

  const [genreRows, yearRows] = await Promise.all([
    db.execute<{ genre: string }>(
      sql`SELECT DISTINCT unnest(genres) AS genre FROM ${schema.albums} WHERE genres IS NOT NULL AND array_length(genres, 1) > 0 ORDER BY genre LIMIT 50`,
    ),
    db
      .selectDistinct({ year: schema.albums.releaseYear })
      .from(schema.albums)
      .orderBy(desc(schema.albums.releaseYear)),
  ]);

  return {
    genres: genreRows.map((r) => r.genre).filter(Boolean),
    years: yearRows.map((r) => r.year),
  };
}

export default async function AlbumsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const genre = params.genre?.trim() ?? "";
  const yearNum = params.year ? Number(params.year) : undefined;
  const year = Number.isFinite(yearNum) ? yearNum : undefined;

  const hasFilters = q !== "" || genre !== "" || year !== undefined;

  const pageNum = params.page ? Number(params.page) : 1;
  const page = Number.isFinite(pageNum) && pageNum > 0 ? Math.floor(pageNum) : 1;
  const filters: AlbumFilters = { q, genre, year };

  const [albums, total, options] = await Promise.all([
    loadAlbums(filters, page),
    countAlbums(filters),
    loadFilterOptions(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-12 sm:px-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm">
            <Link
              href="/"
              className="font-medium text-ink-soft transition hover:text-terra-deep"
            >
              ← Inicio
            </Link>
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
            Catálogo
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {total === 0 && hasFilters
              ? "Ningún álbum coincide con los filtros."
              : `${total} álbum${total === 1 ? "" : "es"}${hasFilters ? " filtrado" + (total === 1 ? "" : "s") : " en el catálogo"}.`}
          </p>
        </div>
      </header>

      <form
        method="get"
        className="grid gap-3 rounded-3xl border border-line bg-surface p-4 shadow-sm sm:grid-cols-[1fr_180px_140px_auto]"
      >
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por título o artista…"
          className="h-10 rounded-full border border-line-strong bg-surface-soft px-4 text-ink outline-none placeholder:text-muted focus:border-terra"
        />
        <select
          name="genre"
          defaultValue={genre}
          className="h-10 rounded-full border border-line-strong bg-surface-soft px-3 text-ink outline-none focus:border-terra"
        >
          <option value="">Todos los géneros</option>
          {options.genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          name="year"
          defaultValue={year ? String(year) : ""}
          className="h-10 rounded-full border border-line-strong bg-surface-soft px-3 text-ink outline-none focus:border-terra"
        >
          <option value="">Todos los años</option>
          {options.years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-full bg-terra px-5 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep"
          >
            Filtrar
          </button>
          {hasFilters ? (
            <Link
              href="/albums"
              className="text-xs text-muted transition hover:text-terra-deep"
            >
              Limpiar
            </Link>
          ) : null}
        </div>
      </form>

      {albums.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {albums.map((a) => (
            <li key={a.id}>
              <Link
                href={`/albums/${a.slug}`}
                className="group flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-terra/40 hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-soft">
                  {a.coverUrl ? (
                    <Image
                      src={a.coverUrl}
                      alt={`Portada de ${a.title}`}
                      width={320}
                      height={320}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl text-line-strong">
                      ♪
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="line-clamp-2 text-sm font-semibold text-ink transition group-hover:text-terra-deep">
                    {a.title}
                  </p>
                  <p className="truncate text-sm text-ink-soft">
                    {a.artistName}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-muted">{a.releaseYear}</span>
                    <span className="nums font-display text-base font-semibold text-terra">
                      {a.avgRating ? Number(a.avgRating).toFixed(1) : "—"}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Paginación"
          className="flex items-center justify-center gap-4 pt-2"
        >
          {page > 1 ? (
            <Link
              href={pageHref(page - 1, filters)}
              className="inline-flex h-10 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition hover:border-terra/40 hover:text-terra-deep"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center rounded-full border border-line px-4 text-sm font-semibold text-muted opacity-50">
              ← Anterior
            </span>
          )}

          <span className="nums text-sm text-ink-soft">
            Página <span className="font-semibold text-ink">{page}</span> de{" "}
            {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={pageHref(page + 1, filters)}
              className="inline-flex h-10 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition hover:border-terra/40 hover:text-terra-deep"
            >
              Siguiente →
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center rounded-full border border-line px-4 text-sm font-semibold text-muted opacity-50">
              Siguiente →
            </span>
          )}
        </nav>
      ) : null}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-2xl ring-1 ring-line">
        💿
      </div>
      {hasFilters ? (
        <>
          <p className="text-sm text-ink-soft">
            Ningún álbum coincide con esos filtros.
          </p>
          <Link
            href="/albums"
            className="inline-flex h-10 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink-soft transition hover:border-terra/40 hover:text-terra-deep"
          >
            Limpiar filtros
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            El catálogo está vacío todavía.
          </p>
          <Link
            href="/admin/albums/new"
            className="inline-flex h-10 items-center rounded-full bg-terra px-4 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] hover:bg-terra-deep"
          >
            Crear primer álbum
          </Link>
        </>
      )}
    </div>
  );
}
