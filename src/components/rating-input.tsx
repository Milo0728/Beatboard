"use client";

import { useOptimistic, useTransition } from "react";

import { useToast } from "@/components/toast";
import { roundToHalf } from "@/lib/validators/rating";

type Props = {
  songId: string;
  initialUserScore: number | null;
  initialAvg: number | null;
  initialCount: number;
  /** Public read-only view (no session). */
  readOnly?: boolean;
};

type ApiResponse = {
  ok: boolean;
  song?: {
    id: string;
    avgRating: string | null;
    ratingCount: number;
    yourScore: string;
  };
  error?: string;
};

export function RatingInput({
  songId,
  initialUserScore,
  initialAvg,
  initialCount,
  readOnly,
}: Props) {
  const [optimistic, setOptimistic] = useOptimistic<{
    userScore: number | null;
    avg: number | null;
    count: number;
  }>({
    userScore: initialUserScore,
    avg: initialAvg,
    count: initialCount,
  });
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const score = optimistic.userScore;

  if (readOnly) {
    return <ReadOnlyDisplay avg={optimistic.avg} count={optimistic.count} />;
  }

  const submit = (value: number | null) => {
    const rounded = value === null ? null : roundToHalf(value);

    startTransition(async () => {
      // optimistic update — assume the new vote pulls the avg slightly toward it
      setOptimistic((prev) => {
        const wasVoting = prev.userScore !== null;
        const newCount = rounded === null ? prev.count - 1 : wasVoting ? prev.count : prev.count + 1;
        let newAvg: number | null;
        if (rounded === null) {
          newAvg = newCount > 0 && prev.avg !== null
            ? roundToHalf((prev.avg * prev.count - (prev.userScore ?? 0)) / Math.max(newCount, 1))
            : null;
        } else if (wasVoting && prev.avg !== null) {
          newAvg = roundToHalf(
            prev.avg + (rounded - (prev.userScore ?? 0)) / Math.max(prev.count, 1),
          );
        } else if (prev.avg !== null) {
          newAvg = roundToHalf((prev.avg * prev.count + rounded) / Math.max(newCount, 1));
        } else {
          newAvg = rounded;
        }
        return { userScore: rounded, avg: newAvg, count: Math.max(newCount, 0) };
      });

      try {
        if (rounded === null) {
          await fetch(`/api/ratings?songId=${songId}`, { method: "DELETE" });
        } else {
          const res = await fetch("/api/ratings", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ kind: "song", songId, score: rounded }),
          });
          const text = await res.text();
          let data: ApiResponse | null = null;
          try {
            data = text ? (JSON.parse(text) as ApiResponse) : null;
          } catch {
            console.error("Rating: non-JSON response", res.status, text.slice(0, 200));
            toast.error("No se pudo guardar tu calificación.");
            return;
          }
          if (!res.ok || !data?.ok) {
            console.error("Rating: server error", res.status, data?.error ?? text);
            toast.error("No se pudo guardar tu calificación.", data?.error);
            return;
          }
          if (data.song) {
            setOptimistic({
              userScore: Number(data.song.yourScore),
              avg: data.song.avgRating ? Number(data.song.avgRating) : null,
              count: data.song.ratingCount,
            });
          }
        }
      } catch (err) {
        console.error("Rating failed", err);
        toast.error("No se pudo guardar tu calificación.");
      }
    });
  };

  return (
    <div className="flex items-center justify-end gap-3">
      <div className="text-right">
        <div className="nums font-display text-base font-semibold text-terra">
          {optimistic.avg != null ? optimistic.avg.toFixed(1) : "—"}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted">
          {optimistic.count} voto{optimistic.count === 1 ? "" : "s"}
        </div>
      </div>

      <ScoreSelect
        value={score}
        disabled={pending}
        onChange={(v) => submit(v)}
      />

      {score !== null ? (
        <button
          type="button"
          onClick={() => submit(null)}
          disabled={pending}
          className="text-sm text-muted transition hover:text-clay disabled:opacity-30"
          aria-label="Quitar calificación"
          title="Quitar mi calificación"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

function ReadOnlyDisplay({ avg, count }: { avg: number | null; count: number }) {
  return (
    <div className="text-right">
      <div className="nums font-display text-base font-semibold text-terra">
        {avg != null ? avg.toFixed(1) : "—"}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted">
        {count} voto{count === 1 ? "" : "s"}
      </div>
    </div>
  );
}

const SCORE_OPTIONS = Array.from({ length: 19 }, (_, i) => (i + 2) / 2); // 1.0, 1.5, ..., 10.0

function ScoreSelect({
  value,
  disabled,
  onChange,
}: {
  value: number | null;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (Number.isFinite(v)) onChange(v);
      }}
      className="nums h-9 w-20 rounded-full border border-line-strong bg-surface-soft px-2 text-center text-sm text-ink outline-none transition focus:border-terra disabled:opacity-50"
      aria-label="Tu nota"
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
  );
}
