import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import { db, schema } from "@/db/client";
import { AlbumRatingInput } from "@/components/album-rating-input";
import { CommentThread, type CommentItem } from "@/components/comment-thread";
import { RatingInput } from "@/components/rating-input";
import { SongTrackRow } from "@/components/song-row-comments";
import { getCurrentUser } from "@/lib/auth";
import { formatDuration } from "@/lib/validators/album";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const album = await loadAlbum(slug);
  if (!album) return { title: "Álbum no encontrado — BeatBoard" };
  return {
    title: `${album.album.title} — ${album.artist.name} · BeatBoard`,
    description: `Calificaciones y reseñas de ${album.album.title} (${album.album.releaseYear})`,
  };
}

async function loadAlbum(slug: string) {
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
    .select()
    .from(schema.songs)
    .where(eq(schema.songs.albumId, row.album.id))
    .orderBy(asc(schema.songs.trackNumber));

  return { ...row, songs };
}

async function loadAlbumComments(albumId: string) {
  if (!db) return [];
  const rows = await db
    .select({
      id: schema.comments.id,
      parentCommentId: schema.comments.parentCommentId,
      body: schema.comments.body,
      createdAt: schema.comments.createdAt,
      authorId: schema.users.id,
      authorDisplayName: schema.users.displayName,
      authorUsername: schema.users.username,
      authorAvatarUrl: schema.users.avatarUrl,
      authorRole: schema.users.role,
    })
    .from(schema.comments)
    .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
    .where(
      and(
        eq(schema.comments.albumId, albumId),
        isNull(schema.comments.deletedAt),
      ),
    )
    .orderBy(desc(schema.comments.createdAt))
    .limit(200);
  return rows;
}

async function loadSongComments(songIds: string[]) {
  if (!db || songIds.length === 0) return [];
  return db
    .select({
      id: schema.comments.id,
      songId: schema.comments.songId,
      body: schema.comments.body,
      createdAt: schema.comments.createdAt,
      authorId: schema.users.id,
      authorDisplayName: schema.users.displayName,
      authorUsername: schema.users.username,
      authorAvatarUrl: schema.users.avatarUrl,
      authorRole: schema.users.role,
    })
    .from(schema.comments)
    .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
    .where(
      and(
        inArray(schema.comments.songId, songIds),
        isNull(schema.comments.deletedAt),
      ),
    )
    .orderBy(desc(schema.comments.createdAt));
}

export default async function AlbumDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await loadAlbum(slug);
  if (!data) notFound();

  const { album, artist, songs } = data;
  const avg = album.avgRating ? Number(album.avgRating).toFixed(1) : null;
  const manualAvg = album.manualAvgRating
    ? Number(album.manualAvgRating).toFixed(1)
    : null;

  const current = await getCurrentUser();
  const profile = current?.profile;
  const canRate =
    profile != null && ["admin", "host", "guest"].includes(profile.role);

  const commentRows = await loadAlbumComments(album.id);
  const toItem = (c: (typeof commentRows)[number]): CommentItem => {
    const isAuthor = profile?.id === c.authorId;
    const isAdmin = profile?.role === "admin";
    return {
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      author: {
        id: c.authorId,
        displayName: c.authorDisplayName,
        username: c.authorUsername,
        avatarUrl: c.authorAvatarUrl,
        role: c.authorRole,
      },
      canDelete: Boolean(isAuthor || isAdmin),
    };
  };

  // Build a one-level tree: top-level comments (newest first) with their
  // replies attached in chronological order. `commentRows` is newest-first.
  const repliesByParent = new Map<string, CommentItem[]>();
  for (const c of commentRows) {
    if (!c.parentCommentId) continue;
    const list = repliesByParent.get(c.parentCommentId) ?? [];
    list.push(toItem(c));
    repliesByParent.set(c.parentCommentId, list);
  }
  for (const list of repliesByParent.values()) list.reverse(); // oldest → newest

  const comments: CommentItem[] = commentRows
    .filter((c) => !c.parentCommentId)
    .map((c) => ({ ...toItem(c), replies: repliesByParent.get(c.id) ?? [] }));
  const currentUserForThread = profile
    ? { id: profile.id, displayName: profile.displayName }
    : null;

  // Map songId → user's current score (if any).
  const userRatings = new Map<string, number>();
  if (db && profile && songs.length > 0) {
    const songIds = songs.map((s) => s.id);
    const myRatings = await db
      .select({ songId: schema.ratings.songId, score: schema.ratings.score })
      .from(schema.ratings)
      .where(
        and(
          eq(schema.ratings.userId, profile.id),
          eq(schema.ratings.ratingType, "song"),
          inArray(schema.ratings.songId, songIds),
        ),
      );
    for (const r of myRatings) {
      if (r.songId) userRatings.set(r.songId, Number(r.score));
    }
  }

  // User's manual album rating (if any).
  let myAlbumScore: number | null = null;
  if (db && profile) {
    const [row] = await db
      .select({ score: schema.ratings.score })
      .from(schema.ratings)
      .where(
        and(
          eq(schema.ratings.userId, profile.id),
          eq(schema.ratings.albumId, album.id),
          eq(schema.ratings.ratingType, "album_manual"),
        ),
      )
      .limit(1);
    if (row) myAlbumScore = Number(row.score);
  }

  // Load comments for every song in one query, grouped by songId.
  const songCommentRows =
    songs.length > 0 ? await loadSongComments(songs.map((s) => s.id)) : [];
  const songComments = new Map<string, CommentItem[]>();
  for (const c of songCommentRows) {
    if (!c.songId) continue;
    const isAuthor = profile?.id === c.authorId;
    const isAdmin = profile?.role === "admin";
    const item: CommentItem = {
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      author: {
        id: c.authorId,
        displayName: c.authorDisplayName,
        username: c.authorUsername,
        avatarUrl: c.authorAvatarUrl,
        role: c.authorRole,
      },
      canDelete: Boolean(isAuthor || isAdmin),
    };
    const list = songComments.get(c.songId);
    if (list) list.push(item);
    else songComments.set(c.songId, [item]);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 py-12 sm:px-8">
      <p className="text-sm">
        <Link
          href="/albums"
          className="font-medium text-ink-soft transition hover:text-terra-deep"
        >
          ← Álbumes
        </Link>
      </p>

      <header className="grid gap-8 sm:grid-cols-[260px_1fr]">
        <div className="aspect-square overflow-hidden rounded-3xl border border-line bg-surface-soft shadow-[0_20px_50px_-28px_rgba(42,32,24,0.5)]">
          {album.coverUrl ? (
            <Image
              src={album.coverUrl}
              alt={`Portada de ${album.title}`}
              width={520}
              height={520}
              className="h-full w-full object-cover"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl text-line-strong">
              ♪
            </div>
          )}
        </div>
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terra">
              Álbum
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
              {album.title}
            </h1>
            <p className="mt-2 text-lg text-ink-soft">
              <Link
                href={`/artists/${artist.slug}`}
                className="font-medium transition hover:text-terra-deep"
              >
                {artist.name}
              </Link>
              <span className="text-muted"> · </span>
              {album.releaseYear}
            </p>
          </div>

          {album.genres.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {album.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-line-strong bg-surface px-2.5 py-0.5 text-xs text-ink-soft"
                >
                  {g}
                </span>
              ))}
            </div>
          ) : null}

          {album.streamEpisodeUrl ? (
            <a
              href={album.streamEpisodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink/90"
            >
              <span aria-hidden>▶</span> Ver reacción / episodio
            </a>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl border border-line bg-surface px-5 py-4 text-sm text-ink-soft shadow-sm">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                Promedio · canciones
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="nums font-display text-3xl font-bold text-terra">
                  {avg ?? "—"}
                </span>
                <span className="text-xs text-muted">
                  /10 · {album.ratingCount} voto
                  {album.ratingCount === 1 ? "" : "s"}
                </span>
              </span>
            </div>

            {album.manualRatingCount > 0 ? (
              <div className="flex flex-col border-line pl-8 sm:border-l">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                  Nota global · audiencia
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className="nums font-display text-3xl font-bold text-gold">
                    {manualAvg}
                  </span>
                  <span className="text-xs text-muted">
                    /10 · {album.manualRatingCount} voto
                    {album.manualRatingCount === 1 ? "" : "s"}
                  </span>
                </span>
              </div>
            ) : null}

            {album.label || album.totalDurationSeconds ? (
              <div className="flex flex-col gap-1 text-xs sm:border-l sm:border-line sm:pl-8">
                {album.label ? (
                  <span>
                    <span className="text-muted">Sello:</span> {album.label}
                  </span>
                ) : null}
                {album.totalDurationSeconds ? (
                  <span>
                    <span className="text-muted">Duración:</span>{" "}
                    {formatDuration(album.totalDurationSeconds)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-1">
            {canRate ? (
              <AlbumRatingInput
                albumId={album.id}
                initialUserScore={myAlbumScore}
              />
            ) : (
              <span className="text-xs text-muted">
                Inicia sesión para dar una nota global al álbum
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Tracklist
        </h2>
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-surface-soft text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="w-12 px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Título</th>
                <th className="w-24 px-4 py-3 text-right">Duración</th>
                <th className="w-48 px-4 py-3 text-right">
                  {canRate ? "Tu nota / Promedio" : "Promedio"}
                </th>
                <th className="w-16 px-4 py-3 text-right">Coment.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {songs.map((s) => {
                const songCommentList = songComments.get(s.id) ?? [];
                return (
                  <SongTrackRow
                    key={s.id}
                    songId={s.id}
                    slug={slug}
                    count={songCommentList.length}
                    comments={songCommentList}
                    currentUser={currentUserForThread}
                    colSpan={5}
                    trackLabel={s.title}
                  >
                    <td className="nums px-4 py-3 text-muted">{s.trackNumber}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{s.title}</span>
                        {s.isHighlight ? (
                          <span className="rounded bg-gold-tint px-1.5 py-0.5 text-xs font-medium text-gold ring-1 ring-gold/30">
                            ★
                          </span>
                        ) : null}
                      </div>
                      {s.featuredArtists.length > 0 ? (
                        <p className="text-xs text-muted">
                          feat. {s.featuredArtists.join(", ")}
                        </p>
                      ) : null}
                    </td>
                    <td className="nums px-4 py-3 text-right text-ink-soft">
                      {formatDuration(s.durationSeconds)}
                    </td>
                    <td className="px-4 py-3">
                      <RatingInput
                        songId={s.id}
                        initialUserScore={userRatings.get(s.id) ?? null}
                        initialAvg={s.avgRating ? Number(s.avgRating) : null}
                        initialCount={s.ratingCount}
                        readOnly={!canRate}
                      />
                    </td>
                  </SongTrackRow>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {!current ? (
        <section className="rounded-3xl border border-line bg-surface p-5 text-center text-sm text-ink-soft shadow-sm">
          <Link
            href={`/login?next=/albums/${slug}`}
            className="font-semibold text-terra-deep hover:text-terra"
          >
            Inicia sesión
          </Link>{" "}
          para calificar las canciones de este álbum.
        </section>
      ) : !canRate ? (
        <section className="rounded-3xl border border-gold/30 bg-gold-tint/60 p-5 text-center text-sm text-gold">
          Tu rol actual ({profile?.role}) no puede emitir calificaciones. Pídele a
          un admin que te eleve a <code>host</code>.
        </section>
      ) : null}

      <CommentThread
        albumId={album.id}
        slug={slug}
        comments={comments}
        currentUser={currentUserForThread}
      />
    </div>
  );
}
