import { NextResponse } from "next/server";
import { desc, eq, isNull } from "drizzle-orm";

import { db, schema } from "@/db/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ResponseAlbum = {
  id: string;
  title: string;
  artistName: string;
  coverUrl: string | null;
  avgRating: string | null;
  ratingCount: number;
};

type ResponseSession = {
  id: string;
  album: ResponseAlbum;
};

export async function GET() {
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "BD no configurada" },
      { status: 500 },
    );
  }

  try {
    const [session] = await db
      .select({
        id: schema.liveSessions.id,
        currentAlbumId: schema.liveSessions.currentAlbumId,
      })
      .from(schema.liveSessions)
      .where(isNull(schema.liveSessions.endedAt))
      .orderBy(desc(schema.liveSessions.startedAt))
      .limit(1);

    if (!session || !session.currentAlbumId) {
      return NextResponse.json({ ok: true, session: null });
    }

    const [albumRow] = await db
      .select({
        id: schema.albums.id,
        title: schema.albums.title,
        coverUrl: schema.albums.coverUrl,
        avgRating: schema.albums.avgRating,
        ratingCount: schema.albums.ratingCount,
        artistName: schema.artists.name,
      })
      .from(schema.albums)
      .innerJoin(schema.artists, eq(schema.albums.artistId, schema.artists.id))
      .where(eq(schema.albums.id, session.currentAlbumId))
      .limit(1);

    if (!albumRow) {
      return NextResponse.json({ ok: true, session: null });
    }

    const payload: ResponseSession = {
      id: session.id,
      album: {
        id: albumRow.id,
        title: albumRow.title,
        artistName: albumRow.artistName,
        coverUrl: albumRow.coverUrl,
        avgRating: albumRow.avgRating,
        ratingCount: albumRow.ratingCount,
      },
    };

    return NextResponse.json({ ok: true, session: payload });
  } catch (err) {
    console.error("[GET /api/live/current] unexpected", err);
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 },
    );
  }
}
