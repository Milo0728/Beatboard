"use server";

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, schema } from "@/db/client";
import { requireRole } from "@/lib/auth";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function setActiveAlbum(albumId: string): Promise<ActionResult> {
  try {
    const current = await requireRole(["admin", "host"], "/live");
    if (!current.profile) {
      return { ok: false, error: "Sin perfil" };
    }
    if (!db) {
      return { ok: false, error: "BD no configurada" };
    }
    if (typeof albumId !== "string" || albumId.length === 0) {
      return { ok: false, error: "albumId inválido" };
    }

    const [album] = await db
      .select({ id: schema.albums.id })
      .from(schema.albums)
      .where(eq(schema.albums.id, albumId))
      .limit(1);
    if (!album) {
      return { ok: false, error: "Álbum no encontrado" };
    }

    // Close any open sessions for this host first.
    await db
      .update(schema.liveSessions)
      .set({ endedAt: sql`now()` })
      .where(
        and(
          eq(schema.liveSessions.hostUserId, current.profile.id),
          isNull(schema.liveSessions.endedAt),
        ),
      );

    await db.insert(schema.liveSessions).values({
      currentAlbumId: albumId,
      hostUserId: current.profile.id,
    });

    revalidatePath("/live");
    revalidatePath("/live/overlay");
    return { ok: true };
  } catch (err) {
    console.error("[setActiveAlbum] error", err);
    return { ok: false, error: "Error interno" };
  }
}

export async function clearActiveAlbum(): Promise<ActionResult> {
  try {
    const current = await requireRole(["admin", "host"], "/live");
    if (!current.profile) {
      return { ok: false, error: "Sin perfil" };
    }
    if (!db) {
      return { ok: false, error: "BD no configurada" };
    }

    const [open] = await db
      .select({ id: schema.liveSessions.id })
      .from(schema.liveSessions)
      .where(
        and(
          eq(schema.liveSessions.hostUserId, current.profile.id),
          isNull(schema.liveSessions.endedAt),
        ),
      )
      .orderBy(desc(schema.liveSessions.startedAt))
      .limit(1);

    if (open) {
      await db
        .update(schema.liveSessions)
        .set({ endedAt: sql`now()` })
        .where(eq(schema.liveSessions.id, open.id));
    }

    revalidatePath("/live");
    revalidatePath("/live/overlay");
    return { ok: true };
  } catch (err) {
    console.error("[clearActiveAlbum] error", err);
    return { ok: false, error: "Error interno" };
  }
}
