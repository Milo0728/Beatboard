import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db, schema } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { ratingInputSchema } from "@/lib/validators/rating";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export async function POST(request: Request) {
  try {
    const current = await getCurrentUser();
    if (!current) return jsonError("No autenticado", 401);

    const profile = current.profile;
    if (!profile || !["admin", "host", "guest"].includes(profile.role)) {
      return jsonError("Tu rol no puede emitir calificaciones", 403);
    }
    if (!db) return jsonError("BD no configurada", 500);

    const rl = rateLimit(`ratings:${profile.id}`, 40, 60_000);
    if (!rl.ok) {
      return jsonError(
        "Demasiadas calificaciones seguidas. Espera un momento.",
        429,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("JSON inválido", 400);
    }

    const parsed = ratingInputSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Datos inválidos", 400, parsed.error.flatten());
    }

    const data = parsed.data;
    const score = data.score.toFixed(1);

    if (data.kind === "song") {
      const [song] = await db
        .select({ id: schema.songs.id, albumId: schema.songs.albumId })
        .from(schema.songs)
        .where(eq(schema.songs.id, data.songId))
        .limit(1);
      if (!song) return jsonError("Canción no encontrada", 404);

      // Find-or-update by (user_id, song_id). The partial unique index makes
      // a clean ON CONFLICT awkward, so we read-then-write — safe enough since
      // each user votes from a single tab.
      const [existing] = await db
        .select({ id: schema.ratings.id })
        .from(schema.ratings)
        .where(
          and(
            eq(schema.ratings.userId, profile.id),
            eq(schema.ratings.songId, data.songId),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(schema.ratings)
          .set({ score, updatedAt: sql`now()` })
          .where(eq(schema.ratings.id, existing.id));
      } else {
        await db.insert(schema.ratings).values({
          userId: profile.id,
          songId: data.songId,
          albumId: null,
          score,
          ratingType: "song",
        });
      }

      const [updatedSong] = await db
        .select({
          avgRating: schema.songs.avgRating,
          ratingCount: schema.songs.ratingCount,
        })
        .from(schema.songs)
        .where(eq(schema.songs.id, data.songId))
        .limit(1);

      const [updatedAlbum] = await db
        .select({
          avgRating: schema.albums.avgRating,
          ratingCount: schema.albums.ratingCount,
        })
        .from(schema.albums)
        .where(eq(schema.albums.id, song.albumId))
        .limit(1);

      return NextResponse.json({
        ok: true,
        song: {
          id: data.songId,
          avgRating: updatedSong?.avgRating ?? null,
          ratingCount: updatedSong?.ratingCount ?? 0,
          yourScore: score,
        },
        album: {
          id: song.albumId,
          avgRating: updatedAlbum?.avgRating ?? null,
          ratingCount: updatedAlbum?.ratingCount ?? 0,
        },
      });
    }

    // Manual album rating
    const [album] = await db
      .select({ id: schema.albums.id })
      .from(schema.albums)
      .where(eq(schema.albums.id, data.albumId))
      .limit(1);
    if (!album) return jsonError("Álbum no encontrado", 404);

    const [existing] = await db
      .select({ id: schema.ratings.id })
      .from(schema.ratings)
      .where(
        and(
          eq(schema.ratings.userId, profile.id),
          eq(schema.ratings.albumId, data.albumId),
          eq(schema.ratings.ratingType, "album_manual"),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(schema.ratings)
        .set({ score, updatedAt: sql`now()` })
        .where(eq(schema.ratings.id, existing.id));
    } else {
      await db.insert(schema.ratings).values({
        userId: profile.id,
        songId: null,
        albumId: data.albumId,
        score,
        ratingType: "album_manual",
      });
    }

    return NextResponse.json({
      ok: true,
      album: { id: data.albumId, yourScore: score },
    });
  } catch (err) {
    console.error("[POST /api/ratings] unexpected", err);
    return jsonError("Error interno", 500, String(err));
  }
}

export async function DELETE(request: Request) {
  try {
    const current = await getCurrentUser();
    if (!current?.profile) return jsonError("No autenticado", 401);
    if (!db) return jsonError("BD no configurada", 500);

    const { searchParams } = new URL(request.url);
    const songId = searchParams.get("songId");
    const albumId = searchParams.get("albumId");
    if (!songId && !albumId) return jsonError("Falta songId o albumId", 400);

    if (songId) {
      await db
        .delete(schema.ratings)
        .where(
          and(
            eq(schema.ratings.userId, current.profile.id),
            eq(schema.ratings.songId, songId),
          ),
        );
    } else if (albumId) {
      await db
        .delete(schema.ratings)
        .where(
          and(
            eq(schema.ratings.userId, current.profile.id),
            eq(schema.ratings.albumId, albumId),
            isNull(schema.ratings.songId),
          ),
        );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/ratings] unexpected", err);
    return jsonError("Error interno", 500, String(err));
  }
}
