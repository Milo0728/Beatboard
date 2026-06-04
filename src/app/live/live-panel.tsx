"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { roundToHalf } from "@/lib/validators/rating";
import { clearActiveAlbum, setActiveAlbum } from "./actions";

type LivePanelProps = {
  album: {
    id: string;
    slug: string;
    title: string;
    artistName: string;
    coverUrl: string | null;
    releaseYear: number;
    avgRating: string | null;
    ratingCount: number;
  };
  songs: Array<{
    id: string;
    trackNumber: number;
    title: string;
    durationSeconds: number | null;
    avgRating: string | null;
    ratingCount: number;
    yourScore: number | null;
  }>;
  isActiveForStream: boolean;
};

type SongRow = {
  id: string;
  trackNumber: number;
  title: string;
  durationSeconds: number | null;
  avgRating: number | null;
  ratingCount: number;
  yourScore: number | null;
  pending: boolean;
  failed: boolean;
};

type ApiResponse = {
  ok: boolean;
  song?: {
    id: string;
    avgRating: string | null;
    ratingCount: number;
    yourScore: string;
  };
  album?: {
    id: string;
    avgRating: string | null;
    ratingCount: number;
  };
  error?: string;
};

function formatScore(value: number | null): string {
  return value == null ? "—" : value.toFixed(1);
}

function formatDurationMMSS(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function digitToScore(digit: number, half: boolean): number {
  // 1..9 → 1..9, 0 → 10. half adds 0.5 (10.0 stays 10.0 — cap).
  const base = digit === 0 ? 10 : digit;
  const raw = half ? Math.min(base + 0.5, 10) : base;
  return roundToHalf(raw);
}

export function LivePanel({
  album,
  songs: initialSongs,
  isActiveForStream,
}: LivePanelProps) {
  const [songs, setSongs] = useState<SongRow[]>(() =>
    initialSongs.map((s) => ({
      id: s.id,
      trackNumber: s.trackNumber,
      title: s.title,
      durationSeconds: s.durationSeconds,
      avgRating: s.avgRating != null ? Number(s.avgRating) : null,
      ratingCount: s.ratingCount,
      yourScore: s.yourScore,
      pending: false,
      failed: false,
    })),
  );

  const [albumStats, setAlbumStats] = useState({
    avg: album.avgRating != null ? Number(album.avgRating) : null,
    count: album.ratingCount,
  });

  const [active, setActive] = useState(isActiveForStream);
  const [overlayPending, startOverlayTransition] = useTransition();
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const setRowRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      rowRefs.current[index] = el;
    },
    [],
  );

  const focusRow = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(rowRefs.current.length - 1, index));
    const el = rowRefs.current[clamped];
    if (el) el.focus();
  }, []);

  const indexOf = useCallback(
    (songId: string) => songs.findIndex((s) => s.id === songId),
    [songs],
  );

  const sendRating = useCallback(
    async (songId: string, score: number | null) => {
      // Optimistic update
      setSongs((prev) => {
        const idx = prev.findIndex((s) => s.id === songId);
        if (idx === -1) return prev;
        const row = prev[idx];
        const wasVoting = row.yourScore !== null;
        const newCount =
          score === null
            ? Math.max(row.ratingCount - 1, 0)
            : wasVoting
              ? row.ratingCount
              : row.ratingCount + 1;
        let newAvg: number | null;
        if (score === null) {
          newAvg =
            newCount > 0 && row.avgRating !== null
              ? roundToHalf(
                  (row.avgRating * row.ratingCount - (row.yourScore ?? 0)) /
                    Math.max(newCount, 1),
                )
              : null;
        } else if (wasVoting && row.avgRating !== null) {
          newAvg = roundToHalf(
            row.avgRating +
              (score - (row.yourScore ?? 0)) / Math.max(row.ratingCount, 1),
          );
        } else if (row.avgRating !== null) {
          newAvg = roundToHalf(
            (row.avgRating * row.ratingCount + score) / Math.max(newCount, 1),
          );
        } else {
          newAvg = score;
        }
        const next = prev.slice();
        next[idx] = {
          ...row,
          yourScore: score,
          avgRating: newAvg,
          ratingCount: newCount,
          pending: true,
          failed: false,
        };
        return next;
      });

      try {
        let res: Response;
        if (score === null) {
          res = await fetch(`/api/ratings?songId=${songId}`, {
            method: "DELETE",
          });
        } else {
          res = await fetch("/api/ratings", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ kind: "song", songId, score }),
          });
        }

        if (!res.ok) {
          console.error("Rating: HTTP error", res.status);
          setSongs((prev) => {
            const idx = prev.findIndex((s) => s.id === songId);
            if (idx === -1) return prev;
            const next = prev.slice();
            next[idx] = { ...next[idx], pending: false, failed: true };
            return next;
          });
          return;
        }

        if (score === null) {
          setSongs((prev) => {
            const idx = prev.findIndex((s) => s.id === songId);
            if (idx === -1) return prev;
            const next = prev.slice();
            next[idx] = { ...next[idx], pending: false, failed: false };
            return next;
          });
          return;
        }

        const text = await res.text();
        let data: ApiResponse | null = null;
        try {
          data = text ? (JSON.parse(text) as ApiResponse) : null;
        } catch {
          console.error("Rating: non-JSON response", text.slice(0, 200));
        }

        if (data?.song) {
          setSongs((prev) => {
            const idx = prev.findIndex((s) => s.id === songId);
            if (idx === -1) return prev;
            const next = prev.slice();
            next[idx] = {
              ...next[idx],
              yourScore: Number(data!.song!.yourScore),
              avgRating: data!.song!.avgRating
                ? Number(data!.song!.avgRating)
                : null,
              ratingCount: data!.song!.ratingCount,
              pending: false,
              failed: false,
            };
            return next;
          });
        } else {
          setSongs((prev) => {
            const idx = prev.findIndex((s) => s.id === songId);
            if (idx === -1) return prev;
            const next = prev.slice();
            next[idx] = { ...next[idx], pending: false };
            return next;
          });
        }

        if (data?.album) {
          setAlbumStats({
            avg: data.album.avgRating ? Number(data.album.avgRating) : null,
            count: data.album.ratingCount,
          });
        }
      } catch (err) {
        console.error("Rating: network error", err);
        setSongs((prev) => {
          const idx = prev.findIndex((s) => s.id === songId);
          if (idx === -1) return prev;
          const next = prev.slice();
          next[idx] = { ...next[idx], pending: false, failed: true };
          return next;
        });
      }
    },
    [],
  );

  const handleSetScore = useCallback(
    (songId: string, score: number) => {
      const rounded = roundToHalf(Math.max(1, Math.min(10, score)));
      void sendRating(songId, rounded);
      const idx = indexOf(songId);
      // Auto-advance focus
      if (idx >= 0 && idx < songs.length - 1) {
        // Defer until after state flush
        setTimeout(() => focusRow(idx + 1), 0);
      }
    },
    [focusRow, indexOf, sendRating, songs.length],
  );

  const handleClear = useCallback(
    (songId: string) => {
      void sendRating(songId, null);
    },
    [sendRating],
  );

  const handleRetry = useCallback(
    (songId: string) => {
      const row = songs.find((s) => s.id === songId);
      if (!row) return;
      void sendRating(songId, row.yourScore);
    },
    [sendRating, songs],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, songId: string, index: number) => {
      const key = event.key;
      const code = event.code;

      // Navigation
      if (key === "ArrowDown") {
        event.preventDefault();
        focusRow(index + 1);
        return;
      }
      if (key === "ArrowUp") {
        event.preventDefault();
        focusRow(index - 1);
        return;
      }
      if (key === "Enter") {
        event.preventDefault();
        focusRow(index + 1);
        return;
      }
      if (key === "Backspace" || key === "Delete") {
        event.preventDefault();
        handleClear(songId);
        return;
      }

      // Digit detection — covers main row and numpad
      let digit: number | null = null;
      if (key >= "0" && key <= "9" && key.length === 1) {
        digit = Number(key);
      } else if (code.startsWith("Numpad")) {
        const tail = code.slice(6);
        if (tail.length === 1 && tail >= "0" && tail <= "9") {
          digit = Number(tail);
        }
      }
      if (digit === null) return;

      event.preventDefault();
      const score = digitToScore(digit, event.shiftKey);
      handleSetScore(songId, score);
    },
    [focusRow, handleClear, handleSetScore],
  );

  const handleOverlayToggle = useCallback(() => {
    setOverlayError(null);
    if (active) {
      // optimistic
      setActive(false);
      startOverlayTransition(async () => {
        const result = await clearActiveAlbum();
        if (!result.ok) {
          setOverlayError(result.error);
          setActive(true);
        }
      });
    } else {
      setActive(true);
      startOverlayTransition(async () => {
        const result = await setActiveAlbum(album.id);
        if (!result.ok) {
          setOverlayError(result.error);
          setActive(false);
        }
      });
    }
  }, [active, album.id]);

  const overlayUrl = useMemo(() => {
    if (typeof window === "undefined") return "/live/overlay";
    return `${window.location.origin}/live/overlay`;
  }, []);

  const handleCopyOverlay = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("clipboard error", err);
    }
  }, [overlayUrl]);

  // Focus the first un-rated row on mount for fast keyboarding.
  useEffect(() => {
    const firstUnrated = songs.findIndex((s) => s.yourScore === null);
    const idx = firstUnrated === -1 ? 0 : firstUnrated;
    const t = setTimeout(() => focusRow(idx), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8">
      <header className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <Link href="/live" className="hover:text-terra-deep">
            ← Elegir otro álbum
          </Link>
        </p>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-terra" />
            Modo en vivo
          </span>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        {/* LEFT — album hero */}
        <aside className="flex flex-col gap-5">
          <div className="aspect-square w-full max-w-xs overflow-hidden rounded-3xl border border-line bg-surface-soft shadow-sm">
            {album.coverUrl ? (
              <Image
                src={album.coverUrl}
                alt={`Portada de ${album.title}`}
                width={640}
                height={640}
                className="h-full w-full object-cover"
                unoptimized
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-7xl text-line-strong">
                ♪
              </div>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-muted">
              Álbum en vivo
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold leading-tight tracking-tight text-ink">
              {album.title}
            </h1>
            <p className="mt-1 text-base text-ink-soft">
              {album.artistName}
              <span className="text-muted"> · </span>
              <span className="text-ink-soft">{album.releaseYear}</span>
            </p>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-muted">
              Promedio del álbum
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="nums font-display text-6xl font-semibold text-terra">
                {formatScore(albumStats.avg)}
              </span>
              <span className="nums font-display text-2xl text-muted">/10</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {albumStats.count} voto{albumStats.count === 1 ? "" : "s"} de
              canciones
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {active ? (
              <>
                <div className="flex items-center gap-2 rounded-full border border-moss/30 bg-moss-tint px-3 py-2 text-sm font-medium text-moss">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-moss" />
                  Activo en stream
                </div>
                <button
                  type="button"
                  onClick={handleOverlayToggle}
                  disabled={overlayPending}
                  className="text-left text-xs text-ink-soft underline-offset-4 hover:text-terra-deep hover:underline disabled:opacity-50"
                >
                  Quitar del overlay
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleOverlayToggle}
                disabled={overlayPending}
                className="inline-flex h-10 items-center justify-center rounded-full bg-terra px-4 font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep disabled:opacity-50"
              >
                {overlayPending ? "Activando…" : "Activar para overlay"}
              </button>
            )}
            {overlayError ? (
              <p className="text-xs text-clay">{overlayError}</p>
            ) : null}
          </div>

          <div className="rounded-xl border border-line bg-surface-soft p-3 text-xs text-ink-soft">
            <p className="text-ink">Overlay para OBS:</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded border border-line bg-surface px-2 py-1 font-mono text-[11px] text-terra">
                /live/overlay
              </code>
              <button
                type="button"
                onClick={handleCopyOverlay}
                className="inline-flex h-7 shrink-0 items-center rounded-md border border-line-strong bg-surface px-2 text-[11px] font-medium text-ink-soft hover:border-terra/40 hover:text-terra-deep"
              >
                {copied ? "¡Copiado!" : "Copiar URL"}
              </button>
            </div>
          </div>
        </aside>

        {/* RIGHT — tracklist + shortcuts */}
        <section className="flex flex-col gap-4">
          <details
            open
            className="rounded-3xl border border-line bg-surface shadow-sm"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3 text-sm font-semibold text-ink">
              <span className="flex items-center gap-2">
                <span className="text-terra">⌨</span>
                Atajos de teclado
              </span>
              <span className="text-xs font-normal text-muted">
                Click para ocultar
              </span>
            </summary>
            <div className="grid gap-2 border-t border-line px-5 py-4 text-xs text-ink-soft sm:grid-cols-2">
              <ShortcutRow keys={["↑", "↓"]} desc="Mover entre canciones" />
              <ShortcutRow keys={["Tab"]} desc="Avanzar (idéntico a ↓)" />
              <ShortcutRow keys={["1", "…", "9"]} desc="Nota entera 1–9" />
              <ShortcutRow keys={["0"]} desc="Nota 10.0" />
              <ShortcutRow keys={["Shift", "+ dígito"]} desc="Suma 0.5 (Shift+7 = 7.5)" />
              <ShortcutRow keys={["Enter"]} desc="Saltar a la siguiente" />
              <ShortcutRow keys={["Backspace"]} desc="Borrar tu nota" />
              <ShortcutRow keys={["Numpad"]} desc="Mismo comportamiento" />
            </div>
          </details>

          <h2 className="px-1 text-sm font-semibold uppercase tracking-widest text-muted">
            Tracklist · {songs.length}
          </h2>

          <ul className="flex flex-col gap-2">
            {songs.map((s, index) => (
              <li key={s.id}>
                <div
                  ref={setRowRef(index)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Canción ${s.trackNumber}: ${s.title}. Tu nota: ${
                    s.yourScore != null ? s.yourScore.toFixed(1) : "sin nota"
                  }`}
                  onKeyDown={(e) => handleKeyDown(e, s.id, index)}
                  className={[
                    "group grid grid-cols-[44px_1fr_auto] items-center gap-4 rounded-2xl border bg-surface px-4 py-3 shadow-sm outline-none transition",
                    s.yourScore != null
                      ? "border-terra/40"
                      : "border-line",
                    "focus:border-terra focus:ring-2 focus:ring-terra/40",
                    s.pending ? "opacity-90" : "",
                  ].join(" ")}
                >
                  <div className="flex flex-col items-center">
                    <span className="nums font-display text-2xl font-semibold text-muted">
                      {s.trackNumber.toString().padStart(2, "0")}
                    </span>
                    {s.durationSeconds != null ? (
                      <span className="nums mt-0.5 text-[10px] text-muted">
                        {formatDurationMMSS(s.durationSeconds)}
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex flex-col gap-1">
                    <p className="truncate text-base font-bold text-ink">
                      {s.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>
                        Promedio{" "}
                        <span className="nums font-semibold text-terra">
                          {formatScore(s.avgRating)}
                        </span>
                      </span>
                      <span>·</span>
                      <span>
                        {s.ratingCount} voto{s.ratingCount === 1 ? "" : "s"}
                      </span>
                      {s.failed ? (
                        <button
                          type="button"
                          onClick={() => handleRetry(s.id)}
                          className="ml-1 rounded-md bg-clay-tint px-2 py-0.5 text-[11px] font-medium text-clay ring-1 ring-clay/30 hover:brightness-[0.98]"
                        >
                          Reintentar
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        "flex h-16 w-20 flex-col items-center justify-center rounded-xl border",
                        s.yourScore != null
                          ? "border-terra/40 bg-terra-tint"
                          : "border-line bg-surface-soft",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "nums font-display text-3xl font-semibold leading-none",
                          s.yourScore != null
                            ? "text-terra-deep"
                            : "text-line-strong",
                        ].join(" ")}
                      >
                        {s.yourScore != null ? s.yourScore.toFixed(1) : "—"}
                      </span>
                      <span className="mt-0.5 text-[9px] uppercase tracking-widest text-muted">
                        Tu nota
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleClear(s.id)}
                      disabled={s.yourScore == null}
                      aria-label="Quitar mi nota"
                      title="Quitar mi nota"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-sm text-muted transition hover:bg-surface-soft hover:text-clay disabled:cursor-not-allowed disabled:opacity-20"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex flex-wrap items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={`${k}-${i}`}
            className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-line-strong bg-surface-soft px-1.5 font-mono text-[10px] font-semibold text-ink"
          >
            {k}
          </kbd>
        ))}
      </span>
      <span className="text-muted">{desc}</span>
    </div>
  );
}
