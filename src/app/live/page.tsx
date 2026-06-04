import Image from "next/image";
import Link from "next/link";
import { and, asc, desc, eq, ilike, inArray, isNull, or, type SQL } from "drizzle-orm";

import { db, schema } from "@/db/client";
import { requireRole } from "@/lib/auth";
import { LivePanel } from "./live-panel";

export const metadata = { title: "En vivo — BeatBoard" };

// Live data: never cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{
  album?: string;
  q?: string;
}>;

type PickerAlbum = {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  releaseYear: number;
  avgRating: string | null;
  ratingCount: number;
  artistName: string;
};

async function loadAlbumsForPicker(q: string): Promise<PickerAlbum[]> {
  if (!db) return [];

  const conditions: SQL[] = [];
  if (q.length > 0) {
    const term = `%${q}%`;
    const titleOrArtist = or(
      ilike(schema.albums.title, term),
      ilike(schema.artists.name, term),
    );
    if (titleOrArtist) conditions.push(titleOrArtist);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: schema.albums.id,
      slug: schema.albums.slug,
      title: schema.albums.title,
      coverUrl: schema.albums.coverUrl,
      releaseYear: schema.albums.releaseYear,
      avgRating: schema.albums.avgRating,
      ratingCount: schema.albums.ratingCount,
      artistName: schema.artists.name,
    })
    .from(schema.albums)
    .innerJoin(schema.artists, eq(schema.albums.artistId, schema.artists.id))
    .where(where)
    .orderBy(desc(schema.albums.createdAt));
}

async function loadAlbumForLive(slug: string) {
  if (!db) return null;
  const [row] = await db
    .select({
      album: schema.albums,
      artist: schema.artists,
    })
    .from(schema.albums)
    .innerJoin(schema.artists, eq(schema.albums.artistId, schema.artists.id))
    .where(eq(schema.albums.slug, slug))
    .limit(1);
  if (!row) return null;

  const songs = await db
    .select({
      id: schema.songs.id,
      trackNumber: schema.songs.trackNumber,
      title: schema.songs.title,
      durationSeconds: schema.songs.durationSeconds,
      avgRating: schema.songs.avgRating,
      ratingCount: schema.songs.ratingCount,
    })
    .from(schema.songs)
    .where(eq(schema.songs.albumId, row.album.id))
    .orderBy(asc(schema.songs.trackNumber));

  return { album: row.album, artist: row.artist, songs };
}

export default async function LivePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const current = await requireRole(["admin", "host"], "/live");
  const params = await searchParams;
  const slug = params.album?.trim() ?? "";
  const q = params.q?.trim() ?? "";

  // Picker view.
  if (!slug) {
    const albums = await loadAlbumsForPicker(q);
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">
              <Link href="/admin" className="hover:text-terra-deep">
                ← Panel
              </Link>
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">
              Sesión en vivo
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Elige un álbum para empezar a calificar canción por canción.
            </p>
          </div>
        </header>

        <form
          method="get"
          className="grid gap-3 rounded-3xl border border-line bg-surface p-4 shadow-sm sm:grid-cols-[1fr_auto]"
        >
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar álbum o artista…"
            autoFocus
            className="h-10 rounded-full border border-line-strong bg-surface-soft px-3 text-ink outline-none focus:border-terra"
          />
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-full bg-terra px-4 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] hover:bg-terra-deep"
          >
            Buscar
          </button>
        </form>

        {albums.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-2xl ring-1 ring-line">
              🎚️
            </div>
            <p className="text-sm text-ink-soft">
              {q
                ? "Ningún álbum coincide con esa búsqueda."
                : "Todavía no hay álbumes en el catálogo."}
            </p>
            {q ? (
              <Link
                href="/live"
                className="inline-flex h-10 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink-soft hover:border-terra/40 hover:text-terra-deep"
              >
                Limpiar búsqueda
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {albums.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/live?album=${encodeURIComponent(a.slug)}`}
                  className="group flex flex-col gap-2 rounded-3xl border border-line bg-surface p-3 shadow-sm transition hover:border-terra/40"
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-soft">
                    {a.coverUrl ? (
                      <Image
                        src={a.coverUrl}
                        alt={`Portada de ${a.title}`}
                        width={320}
                        height={320}
                        className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-line-strong">
                        ♪
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="line-clamp-2 text-sm font-semibold text-ink group-hover:text-terra-deep">
                      {a.title}
                    </p>
                    <p className="truncate text-sm text-ink-soft">
                      {a.artistName}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-muted">
                        {a.releaseYear}
                      </span>
                      <span className="nums font-display text-sm font-semibold text-terra">
                        {a.avgRating ? Number(a.avgRating).toFixed(1) : "—"}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Live panel view.
  const data = await loadAlbumForLive(slug);
  if (!data) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
        <div className="rounded-3xl border border-line bg-surface p-8 text-center shadow-sm">
          <p className="text-2xl">🎛️</p>
          <h1 className="mt-3 font-display text-xl font-semibold text-ink">Álbum no encontrado</h1>
          <p className="mt-2 text-sm text-ink-soft">
            El slug{" "}
            <code className="rounded bg-surface-soft px-1.5 py-0.5 text-terra">
              {slug}
            </code>{" "}
            no coincide con ningún álbum del catálogo.
          </p>
          <div className="mt-6">
            <Link
              href="/live"
              className="inline-flex h-10 items-center rounded-full bg-terra px-4 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] hover:bg-terra-deep"
            >
              ← Volver a elegir álbum
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const profile = current.profile;
  if (!profile) {
    // Should be unreachable thanks to requireRole, but keeps TS narrow.
    return null;
  }

  // Load the host's existing ratings for these songs.
  const songIds = data.songs.map((s) => s.id);
  const yourRatings = new Map<string, number>();
  if (db && songIds.length > 0) {
    const rows = await db
      .select({ songId: schema.ratings.songId, score: schema.ratings.score })
      .from(schema.ratings)
      .where(
        and(
          eq(schema.ratings.userId, profile.id),
          eq(schema.ratings.ratingType, "song"),
          inArray(schema.ratings.songId, songIds),
        ),
      );
    for (const r of rows) {
      if (r.songId) yourRatings.set(r.songId, Number(r.score));
    }
  }

  // Determine if THIS album is currently the host's active overlay album.
  let isActiveForStream = false;
  if (db) {
    const [openSession] = await db
      .select({ currentAlbumId: schema.liveSessions.currentAlbumId })
      .from(schema.liveSessions)
      .where(
        and(
          eq(schema.liveSessions.hostUserId, profile.id),
          isNull(schema.liveSessions.endedAt),
        ),
      )
      .orderBy(desc(schema.liveSessions.startedAt))
      .limit(1);
    isActiveForStream = openSession?.currentAlbumId === data.album.id;
  }

  return (
    <LivePanel
      album={{
        id: data.album.id,
        slug: data.album.slug,
        title: data.album.title,
        artistName: data.artist.name,
        coverUrl: data.album.coverUrl,
        releaseYear: data.album.releaseYear,
        avgRating: data.album.avgRating,
        ratingCount: data.album.ratingCount,
      }}
      songs={data.songs.map((s) => ({
        id: s.id,
        trackNumber: s.trackNumber,
        title: s.title,
        durationSeconds: s.durationSeconds,
        avgRating: s.avgRating,
        ratingCount: s.ratingCount,
        yourScore: yourRatings.get(s.id) ?? null,
      }))}
      isActiveForStream={isActiveForStream}
    />
  );
}
