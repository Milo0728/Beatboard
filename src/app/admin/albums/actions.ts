"use server";

import { and, asc, desc, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, schema } from "@/db/client";
import { requireRole } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { albumInputSchema, type AlbumInput } from "@/lib/validators/album";

export type CreateAlbumResult =
  | { ok: true; slug: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createAlbum(input: AlbumInput): Promise<CreateAlbumResult> {
  const current = await requireRole(["admin", "host"], "/admin/albums/new");

  const parsed = albumInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  if (!db) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  const data = parsed.data;
  const artistSlug = slugify(data.artistName);
  const albumSlugBase = slugify(`${data.artistName}-${data.title}`);
  if (!artistSlug || !albumSlugBase) {
    return { ok: false, error: "Título o artista produce un slug vacío." };
  }

  // Ensure album slug is unique (append -2, -3... on collision).
  let albumSlug = albumSlugBase;
  {
    let attempt = 1;
    while (true) {
      const existing = await db
        .select({ id: schema.albums.id })
        .from(schema.albums)
        .where(eq(schema.albums.slug, albumSlug))
        .limit(1);
      if (existing.length === 0) break;
      attempt += 1;
      albumSlug = `${albumSlugBase}-${attempt}`;
    }
  }

  // Find-or-create artist by slug.
  let artistId: string;
  const existingArtist = await db
    .select({ id: schema.artists.id })
    .from(schema.artists)
    .where(eq(schema.artists.slug, artistSlug))
    .limit(1);

  if (existingArtist.length > 0) {
    artistId = existingArtist[0].id;
  } else {
    const [created] = await db
      .insert(schema.artists)
      .values({ name: data.artistName, slug: artistSlug })
      .returning({ id: schema.artists.id });
    artistId = created.id;
  }

  const totalDuration = data.tracks.reduce(
    (acc, t) => acc + (t.durationSeconds ?? 0),
    0,
  );

  await db.transaction(async (tx) => {
    const [album] = await tx
      .insert(schema.albums)
      .values({
        artistId,
        title: data.title,
        slug: albumSlug,
        releaseYear: data.releaseYear,
        coverUrl: data.coverUrl ?? null,
        genres: data.genres,
        label: data.label ?? null,
        totalDurationSeconds: totalDuration || null,
        streamEpisodeUrl: data.streamEpisodeUrl ?? null,
        createdBy: current.profile?.id ?? null,
      })
      .returning({ id: schema.albums.id });

    await tx.insert(schema.songs).values(
      data.tracks.map((t) => ({
        albumId: album.id,
        trackNumber: t.trackNumber,
        title: t.title,
        durationSeconds: t.durationSeconds ?? null,
        featuredArtists: t.featuredArtists,
        isHighlight: t.isHighlight,
      })),
    );
  });

  revalidatePath("/admin/albums");
  revalidatePath(`/albums/${albumSlug}`);
  revalidatePath("/");

  return { ok: true, slug: albumSlug };
}

export type AlbumListItem = {
  id: string;
  title: string;
  slug: string;
  releaseYear: number;
  coverUrl: string | null;
  artistName: string;
  artistSlug: string;
  trackCount: number;
  avgRating: string | null;
};

export async function listAlbums(): Promise<AlbumListItem[]> {
  await requireRole(["admin", "host"], "/admin/albums");

  if (!db) return [];

  const rows = await db
    .select({
      id: schema.albums.id,
      title: schema.albums.title,
      slug: schema.albums.slug,
      releaseYear: schema.albums.releaseYear,
      coverUrl: schema.albums.coverUrl,
      avgRating: schema.albums.avgRating,
      artistName: schema.artists.name,
      artistSlug: schema.artists.slug,
    })
    .from(schema.albums)
    .innerJoin(schema.artists, eq(schema.albums.artistId, schema.artists.id))
    .orderBy(desc(schema.albums.createdAt));

  if (rows.length === 0) return [];

  // Count tracks per album in one extra query (avoids N+1).
  const albumIds = rows.map((r) => r.id);
  const counts = new Map<string, number>();
  if (albumIds.length > 0) {
    const trackRows = await db
      .select({ albumId: schema.songs.albumId })
      .from(schema.songs);
    for (const t of trackRows) {
      if (albumIds.includes(t.albumId)) {
        counts.set(t.albumId, (counts.get(t.albumId) ?? 0) + 1);
      }
    }
  }

  return rows.map((r) => ({
    ...r,
    trackCount: counts.get(r.id) ?? 0,
  }));
}

export type AlbumEditPayload = {
  id: string;
  title: string;
  artistName: string;
  releaseYear: number;
  coverUrl: string;
  label: string;
  /** Comma-joined for the form input. */
  genres: string;
  streamEpisodeUrl: string;
  tracks: Array<{
    title: string;
    durationSeconds: number | null;
    featuredArtists: string[];
    isHighlight: boolean;
  }>;
};

export async function loadAlbumForEdit(
  slug: string,
): Promise<AlbumEditPayload | null> {
  await requireRole(["admin", "host"], `/admin/albums/${slug}/edit`);

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

  const trackRows = await db
    .select({
      title: schema.songs.title,
      trackNumber: schema.songs.trackNumber,
      durationSeconds: schema.songs.durationSeconds,
      featuredArtists: schema.songs.featuredArtists,
      isHighlight: schema.songs.isHighlight,
    })
    .from(schema.songs)
    .where(eq(schema.songs.albumId, row.album.id))
    .orderBy(asc(schema.songs.trackNumber));

  return {
    id: row.album.id,
    title: row.album.title,
    artistName: row.artist.name,
    releaseYear: row.album.releaseYear,
    coverUrl: row.album.coverUrl ?? "",
    label: row.album.label ?? "",
    genres: (row.album.genres ?? []).join(", "),
    streamEpisodeUrl: row.album.streamEpisodeUrl ?? "",
    tracks: trackRows.map((t) => ({
      title: t.title,
      durationSeconds: t.durationSeconds ?? null,
      featuredArtists: t.featuredArtists ?? [],
      isHighlight: t.isHighlight,
    })),
  };
}

export type UpdateAlbumResult =
  | { ok: true; slug: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateAlbum(
  slug: string,
  input: AlbumInput,
): Promise<UpdateAlbumResult> {
  await requireRole(["admin", "host"], `/admin/albums/${slug}/edit`);

  const parsed = albumInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  if (!db) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  const data = parsed.data;

  const [existingAlbum] = await db
    .select({
      id: schema.albums.id,
      slug: schema.albums.slug,
      artistId: schema.albums.artistId,
    })
    .from(schema.albums)
    .where(eq(schema.albums.slug, slug))
    .limit(1);

  if (!existingAlbum) {
    return { ok: false, error: "Álbum no encontrado." };
  }

  const artistSlug = slugify(data.artistName);
  const albumSlugBase = slugify(`${data.artistName}-${data.title}`);
  if (!artistSlug || !albumSlugBase) {
    return { ok: false, error: "Título o artista produce un slug vacío." };
  }

  // Ensure album slug is unique among other albums (ignore the one being updated).
  let albumSlug = albumSlugBase;
  {
    let attempt = 1;
    while (true) {
      const collision = await db
        .select({ id: schema.albums.id })
        .from(schema.albums)
        .where(
          and(
            eq(schema.albums.slug, albumSlug),
            ne(schema.albums.id, existingAlbum.id),
          ),
        )
        .limit(1);
      if (collision.length === 0) break;
      attempt += 1;
      albumSlug = `${albumSlugBase}-${attempt}`;
    }
  }

  // Find-or-create artist by slug.
  let artistId: string;
  const existingArtist = await db
    .select({ id: schema.artists.id })
    .from(schema.artists)
    .where(eq(schema.artists.slug, artistSlug))
    .limit(1);

  if (existingArtist.length > 0) {
    artistId = existingArtist[0].id;
  } else {
    const [created] = await db
      .insert(schema.artists)
      .values({ name: data.artistName, slug: artistSlug })
      .returning({ id: schema.artists.id });
    artistId = created.id;
  }

  const totalDuration = data.tracks.reduce(
    (acc, t) => acc + (t.durationSeconds ?? 0),
    0,
  );

  await db.transaction(async (tx) => {
    await tx
      .update(schema.albums)
      .set({
        artistId,
        title: data.title,
        slug: albumSlug,
        releaseYear: data.releaseYear,
        coverUrl: data.coverUrl ?? null,
        genres: data.genres,
        label: data.label ?? null,
        totalDurationSeconds: totalDuration || null,
        streamEpisodeUrl: data.streamEpisodeUrl ?? null,
      })
      .where(eq(schema.albums.id, existingAlbum.id));

    // Full replace of the tracklist: delete then insert.
    await tx.delete(schema.songs).where(eq(schema.songs.albumId, existingAlbum.id));

    await tx.insert(schema.songs).values(
      data.tracks.map((t) => ({
        albumId: existingAlbum.id,
        trackNumber: t.trackNumber,
        title: t.title,
        durationSeconds: t.durationSeconds ?? null,
        featuredArtists: t.featuredArtists,
        isHighlight: t.isHighlight,
      })),
    );
  });

  revalidatePath("/admin/albums");
  revalidatePath(`/admin/albums/${slug}/edit`);
  revalidatePath(`/albums/${slug}`);
  if (albumSlug !== slug) {
    revalidatePath(`/admin/albums/${albumSlug}/edit`);
    revalidatePath(`/albums/${albumSlug}`);
  }
  revalidatePath("/");

  return { ok: true, slug: albumSlug };
}

export type DeleteAlbumResult = { ok: true } | { ok: false; error: string };

export async function deleteAlbum(slug: string): Promise<DeleteAlbumResult> {
  await requireRole(["admin"], "/admin/albums");

  if (!db) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  const trimmedSlug = slug.trim();
  if (!trimmedSlug) {
    return { ok: false, error: "Slug inválido." };
  }

  const [existing] = await db
    .select({ id: schema.albums.id })
    .from(schema.albums)
    .where(eq(schema.albums.slug, trimmedSlug))
    .limit(1);

  if (!existing) {
    return { ok: false, error: "Álbum no encontrado." };
  }

  await db.delete(schema.albums).where(eq(schema.albums.id, existing.id));

  revalidatePath("/admin/albums");
  revalidatePath("/");
  revalidatePath("/rankings");
  revalidatePath("/albums");

  redirect("/admin/albums");
}
