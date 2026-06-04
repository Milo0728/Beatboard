"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db, schema } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export type ActionResult = { ok: true } | { ok: false; error: string };

const RATE_MSG = "Vas muy rápido. Espera unos segundos antes de comentar otra vez.";

function commentRateOk(userId: string): boolean {
  return rateLimit(`comment:${userId}`, 8, 60_000).ok;
}

const bodySchema = z
  .string()
  .trim()
  .min(1, "Escribe algo antes de publicar.")
  .max(4000, "El comentario no puede superar los 4000 caracteres.");

const createSchema = z.object({
  albumId: z.string().uuid({ message: "Álbum inválido." }),
  body: bodySchema,
  slug: z.string().min(1),
});

const createSongSchema = z.object({
  songId: z.string().uuid({ message: "Canción inválida." }),
  body: bodySchema,
  slug: z.string().min(1),
});

const deleteSchema = z.object({
  commentId: z.string().uuid({ message: "Comentario inválido." }),
  slug: z.string().min(1),
});

export async function createComment(
  albumId: string,
  body: string,
  slug: string,
): Promise<ActionResult> {
  const parsed = createSchema.safeParse({ albumId, body, slug });
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Datos inválidos.";
    return { ok: false, error: first };
  }

  const current = await getCurrentUser();
  if (!current || !current.profile) {
    return { ok: false, error: "Debes iniciar sesión para comentar." };
  }

  if (!db) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  if (!commentRateOk(current.profile.id)) {
    return { ok: false, error: RATE_MSG };
  }

  const [album] = await db
    .select({ id: schema.albums.id })
    .from(schema.albums)
    .where(eq(schema.albums.id, parsed.data.albumId))
    .limit(1);

  if (!album) {
    return { ok: false, error: "Álbum no encontrado." };
  }

  await db.insert(schema.comments).values({
    userId: current.profile.id,
    albumId: parsed.data.albumId,
    songId: null,
    parentCommentId: null,
    body: parsed.data.body,
  });

  revalidatePath(`/albums/${parsed.data.slug}`);
  return { ok: true };
}

export async function createSongComment(
  songId: string,
  body: string,
  slug: string,
): Promise<ActionResult> {
  const parsed = createSongSchema.safeParse({ songId, body, slug });
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Datos inválidos.";
    return { ok: false, error: first };
  }

  const current = await getCurrentUser();
  if (!current || !current.profile) {
    return { ok: false, error: "Debes iniciar sesión para comentar." };
  }

  if (!db) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  if (!commentRateOk(current.profile.id)) {
    return { ok: false, error: RATE_MSG };
  }

  const [song] = await db
    .select({ id: schema.songs.id })
    .from(schema.songs)
    .where(eq(schema.songs.id, parsed.data.songId))
    .limit(1);

  if (!song) {
    return { ok: false, error: "Canción no encontrada." };
  }

  await db.insert(schema.comments).values({
    userId: current.profile.id,
    albumId: null,
    songId: parsed.data.songId,
    parentCommentId: null,
    body: parsed.data.body,
  });

  revalidatePath(`/albums/${parsed.data.slug}`);
  return { ok: true };
}

const createReplySchema = z.object({
  parentCommentId: z.string().uuid({ message: "Comentario inválido." }),
  body: bodySchema,
  slug: z.string().min(1),
});

export async function createReply(
  parentCommentId: string,
  body: string,
  slug: string,
): Promise<ActionResult> {
  const parsed = createReplySchema.safeParse({ parentCommentId, body, slug });
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Datos inválidos.";
    return { ok: false, error: first };
  }

  const current = await getCurrentUser();
  if (!current || !current.profile) {
    return { ok: false, error: "Debes iniciar sesión para responder." };
  }

  if (!db) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  if (!commentRateOk(current.profile.id)) {
    return { ok: false, error: RATE_MSG };
  }

  const [parent] = await db
    .select({
      id: schema.comments.id,
      albumId: schema.comments.albumId,
      songId: schema.comments.songId,
      parentCommentId: schema.comments.parentCommentId,
    })
    .from(schema.comments)
    .where(
      and(
        eq(schema.comments.id, parsed.data.parentCommentId),
        isNull(schema.comments.deletedAt),
      ),
    )
    .limit(1);

  if (!parent) {
    return { ok: false, error: "El comentario ya no existe." };
  }

  // Flatten to a single level: a reply always attaches to the top-level comment.
  const rootId = parent.parentCommentId ?? parent.id;

  await db.insert(schema.comments).values({
    userId: current.profile.id,
    albumId: parent.albumId,
    songId: parent.songId,
    parentCommentId: rootId,
    body: parsed.data.body,
  });

  revalidatePath(`/albums/${parsed.data.slug}`);
  return { ok: true };
}

export async function softDeleteComment(
  commentId: string,
  slug: string,
): Promise<ActionResult> {
  const parsed = deleteSchema.safeParse({ commentId, slug });
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Datos inválidos.";
    return { ok: false, error: first };
  }

  const current = await getCurrentUser();
  if (!current || !current.profile) {
    return { ok: false, error: "Debes iniciar sesión." };
  }

  if (!db) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  const [comment] = await db
    .select({ id: schema.comments.id, userId: schema.comments.userId })
    .from(schema.comments)
    .where(
      and(
        eq(schema.comments.id, parsed.data.commentId),
        isNull(schema.comments.deletedAt),
      ),
    )
    .limit(1);

  if (!comment) {
    return { ok: false, error: "Comentario no encontrado." };
  }

  const isAuthor = comment.userId === current.profile.id;
  const isAdmin = current.profile.role === "admin";
  if (!isAuthor && !isAdmin) {
    return { ok: false, error: "No puedes eliminar este comentario." };
  }

  await db
    .update(schema.comments)
    .set({ deletedAt: new Date() })
    .where(eq(schema.comments.id, parsed.data.commentId));

  revalidatePath(`/albums/${parsed.data.slug}`);
  return { ok: true };
}
