"use client";

import { useOptimistic, useTransition } from "react";

import { useToast } from "@/components/toast";
import { roundToHalf } from "@/lib/validators/rating";

type Props = {
  albumId: string;
  initialUserScore: number | null;
};

type ApiResponse = {
  ok: boolean;
  album?: {
    id: string;
    yourScore: string;
  };
  error?: string;
};

const SCORE_OPTIONS = Array.from({ length: 19 }, (_, i) => (i + 2) / 2); // 1.0..10.0

export function AlbumRatingInput({ albumId, initialUserScore }: Props) {
  const [optimistic, setOptimistic] = useOptimistic<{ userScore: number | null }>({
    userScore: initialUserScore,
  });
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const score = optimistic.userScore;

  const submit = (value: number | null) => {
    const rounded = value === null ? null : roundToHalf(value);

    startTransition(async () => {
      setOptimistic({ userScore: rounded });

      try {
        if (rounded === null) {
          await fetch(`/api/ratings?albumId=${albumId}`, { method: "DELETE" });
          toast.success("Quitaste tu nota del álbum");
        } else {
          const res = await fetch("/api/ratings", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              kind: "album_manual",
              albumId,
              score: rounded,
            }),
          });
          const text = await res.text();
          let data: ApiResponse | null = null;
          try {
            data = text ? (JSON.parse(text) as ApiResponse) : null;
          } catch {
            console.error(
              "AlbumRating: non-JSON response",
              res.status,
              text.slice(0, 200),
            );
            toast.error("No se pudo guardar tu nota.");
            return;
          }
          if (!res.ok || !data?.ok) {
            console.error(
              "AlbumRating: server error",
              res.status,
              data?.error ?? text,
            );
            toast.error("No se pudo guardar tu nota.", data?.error);
            return;
          }
          if (data.album) {
            setOptimistic({ userScore: Number(data.album.yourScore) });
            toast.success("Nota del álbum guardada");
          }
        }
      } catch (err) {
        console.error("AlbumRating failed", err);
        toast.error("No se pudo guardar tu nota.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">
        Mi nota del álbum
      </span>
      <div className="flex items-center gap-2">
        <select
          value={score ?? ""}
          disabled={pending}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) submit(v);
          }}
          className="nums h-9 w-20 rounded-full border border-line-strong bg-surface-soft px-2 text-center text-sm text-ink outline-none transition focus:border-terra disabled:opacity-50"
          aria-label="Mi nota del álbum"
        >
          <option value="" disabled>
            Tu nota
          </option>
          {SCORE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.toFixed(1)}
            </option>
          ))}
        </select>
        {score !== null ? (
          <>
            <span className="nums font-display text-base font-semibold text-terra">
              {score.toFixed(1)}
            </span>
            <button
              type="button"
              onClick={() => submit(null)}
              disabled={pending}
              className="text-sm text-muted transition hover:text-clay disabled:opacity-30"
              aria-label="Quitar mi nota del álbum"
              title="Quitar mi nota del álbum"
            >
              ✕
            </button>
          </>
        ) : (
          <span className="text-xs text-muted">Aún no votas</span>
        )}
      </div>
    </div>
  );
}
