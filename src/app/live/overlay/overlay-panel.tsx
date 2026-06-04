"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type OverlayPanelProps = {
  sessionId: string;
  album: {
    id: string;
    title: string;
    artistName: string;
    coverUrl: string | null;
    avgRating: string | null;
    ratingCount: number;
  };
};

type AlbumRow = {
  id: string;
  avg_rating: string | null;
  rating_count: number | null;
};

type SessionRow = {
  id: string;
  current_album_id: string | null;
  ended_at: string | null;
};

function parseAvg(value: string | null): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(1);
}

export function OverlayPanel({ sessionId, album }: OverlayPanelProps) {
  const [avgRating, setAvgRating] = useState<string | null>(album.avgRating);
  const [ratingCount, setRatingCount] = useState<number>(album.ratingCount);
  const [pulse, setPulse] = useState(false);

  // Track previous avg so we only pulse on actual change after mount.
  const lastAvgRef = useRef<string | null>(album.avgRating);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const albumChannel = supabase
      .channel(`overlay:album:${album.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "albums",
          filter: `id=eq.${album.id}`,
        },
        (payload) => {
          const next = payload.new as AlbumRow;
          if (!next) return;
          setAvgRating((prev) => {
            const newAvg = next.avg_rating ?? null;
            if (prev !== newAvg) lastAvgRef.current = newAvg;
            return newAvg;
          });
          setRatingCount(
            typeof next.rating_count === "number" ? next.rating_count : 0,
          );
        },
      )
      .subscribe();

    const sessionChannel = supabase
      .channel(`overlay:session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const next = payload.new as SessionRow;
          if (!next) return;
          // If session ended or moved to a different album, reload to pick up the new state.
          if (next.ended_at || next.current_album_id !== album.id) {
            window.location.reload();
          }
        },
      )
      // Also listen for new sessions appearing (a host could start a fresh one).
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_sessions",
        },
        () => {
          window.location.reload();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(albumChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [album.id, sessionId]);

  // Bump the badge whenever avgRating changes (after initial mount).
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 320);
    return () => window.clearTimeout(t);
  }, [avgRating]);

  const displayAvg = parseAvg(avgRating);

  return (
    <div className="absolute bottom-8 left-8 flex items-stretch gap-5 rounded-2xl border border-white/10 bg-[#040415]/90 p-5 shadow-2xl backdrop-blur">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {album.coverUrl ? (
          <Image
            src={album.coverUrl}
            alt={`Portada de ${album.title}`}
            width={192}
            height={192}
            className="h-full w-full object-cover"
            unoptimized
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-white/20">
            ♪
          </div>
        )}
      </div>

      <div className="flex min-w-[18rem] max-w-md flex-col justify-center gap-1.5">
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-lemon/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-lemon ring-1 ring-lemon/30">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lemon" />
          En vivo
        </div>
        <h1 className="truncate font-display text-2xl font-bold leading-tight tracking-tight text-white">
          {album.title}
        </h1>
        <p className="truncate text-base text-white/70">{album.artistName}</p>
      </div>

      <div className="flex flex-col items-end justify-center pl-2">
        <span
          className={[
            "nums font-display text-7xl font-extrabold leading-none text-lemon transition-transform duration-300",
            pulse ? "scale-110" : "scale-100",
          ].join(" ")}
        >
          {displayAvg}
        </span>
        <span className="mt-1 text-xs text-white/50">
          ({ratingCount} voto{ratingCount === 1 ? "" : "s"})
        </span>
      </div>
    </div>
  );
}
