import type { Metadata } from "next";
import { desc, eq, isNull } from "drizzle-orm";

import { db, schema } from "@/db/client";
import { OverlayPanel } from "./overlay-panel";

export const metadata: Metadata = {
  title: "Overlay — BeatBoard",
};

// Always render fresh on each load; the client component handles realtime updates.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ActiveSession = {
  id: string;
  album: {
    id: string;
    title: string;
    artistName: string;
    coverUrl: string | null;
    avgRating: string | null;
    ratingCount: number;
  };
};

async function loadActiveSession(): Promise<ActiveSession | null> {
  if (!db) return null;

  const [session] = await db
    .select({
      id: schema.liveSessions.id,
      currentAlbumId: schema.liveSessions.currentAlbumId,
    })
    .from(schema.liveSessions)
    .where(isNull(schema.liveSessions.endedAt))
    .orderBy(desc(schema.liveSessions.startedAt))
    .limit(1);

  if (!session || !session.currentAlbumId) return null;

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

  if (!albumRow) return null;

  return {
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
}

export default async function OverlayPage() {
  const active = await loadActiveSession();

  return (
    <div className="relative min-h-screen bg-transparent p-8">
      {active ? (
        <OverlayPanel sessionId={active.id} album={active.album} />
      ) : (
        <IdleCard />
      )}
    </div>
  );
}

function IdleCard() {
  return (
    <div className="absolute bottom-8 left-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#040415]/90 px-5 py-3 text-sm text-white/60 shadow-2xl backdrop-blur">
      <span className="h-2 w-2 animate-pulse rounded-full bg-lemon" />
      <span className="font-medium tracking-wide">Sin sesión activa</span>
    </div>
  );
}
