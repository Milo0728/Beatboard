"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  createSongComment,
  softDeleteComment,
} from "@/app/albums/[slug]/comments/actions";
import { useConfirm } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";

import type { CommentItem } from "@/components/comment-thread";

type Props = {
  songId: string;
  slug: string;
  comments: CommentItem[];
  currentUser: { id: string; displayName: string } | null;
};

const MAX_LENGTH = 4000;

export function SongCommentThread({
  songId,
  slug,
  comments,
  currentUser,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
      {currentUser ? (
        <SongCommentComposer songId={songId} slug={slug} />
      ) : (
        <p className="text-xs text-muted">
          <Link
            href={`/login?next=/albums/${slug}`}
            className="font-semibold text-terra-deep hover:text-terra"
          >
            Inicia sesión
          </Link>{" "}
          para comentar esta canción.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="text-xs text-muted">
          Sé el primero en comentar esta canción.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {comments.map((c) => (
            <li key={c.id}>
              <SongCommentRow comment={c} slug={slug} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SongCommentComposer({ songId, slug }: { songId: string; slug: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      setError("Escribe algo antes de publicar.");
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(`Máximo ${MAX_LENGTH} caracteres.`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createSongComment(songId, trimmed, slug);
      if (result.ok) {
        setBody("");
        toast.success("Comentario publicado");
      } else {
        toast.error("No se pudo publicar", result.error);
      }
    });
  };

  const remaining = MAX_LENGTH - body.length;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={MAX_LENGTH}
        disabled={pending}
        placeholder="Tu comentario sobre esta canción..."
        className="w-full resize-y rounded-xl border border-line-strong bg-surface-soft px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-terra disabled:opacity-60"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`text-[10px] ${
            remaining < 0
              ? "text-clay"
              : remaining < 200
                ? "text-gold"
                : "text-muted"
          }`}
        >
          {remaining} restantes
        </span>
        <div className="flex items-center gap-2">
          {error ? (
            <span className="text-[11px] text-clay" role="alert">
              {error}
            </span>
          ) : null}
          <button
            type="submit"
            disabled={pending || body.trim().length === 0}
            className="h-8 rounded-full bg-terra px-4 text-xs font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </div>
    </form>
  );
}

function SongCommentRow({ comment, slug }: { comment: CommentItem; slug: string }) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const toast = useToast();

  const onDelete = async () => {
    const ok = await confirm({
      title: "Eliminar comentario",
      description: "Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await softDeleteComment(comment.id, slug);
      if (result.ok) {
        toast.success("Comentario eliminado");
      } else {
        toast.error("No se pudo eliminar", result.error);
      }
    });
  };

  return (
    <article className="rounded-xl border border-line bg-surface-soft p-3">
      <header className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-ink">
              {comment.author.displayName}
            </span>
            <span className="text-[11px] text-muted">
              @{comment.author.username}
            </span>
            <RoleBadge role={comment.author.role} />
            <span className="text-[11px] text-muted">·</span>
            <time
              dateTime={comment.createdAt}
              className="text-[11px] text-muted"
              title={new Date(comment.createdAt).toLocaleString("es-ES")}
            >
              {formatRelative(comment.createdAt)}
            </time>
          </div>
        </div>
        {comment.canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="text-[11px] text-muted transition hover:text-clay disabled:opacity-50"
          >
            {pending ? "Eliminando..." : "Eliminar"}
          </button>
        ) : null}
      </header>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">
        {comment.body}
      </p>
    </article>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "viewer") return null;
  const styles: Record<string, string> = {
    admin: "bg-terra-tint text-terra-deep ring-terra/25",
    host: "bg-moss-tint text-moss ring-moss/30",
    guest: "bg-gold-tint text-gold ring-gold/30",
  };
  const cls = styles[role] ?? "bg-surface-soft text-ink-soft ring-line-strong";
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ring-1 ${cls}`}
    >
      {role}
    </span>
  );
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);

  if (diffSec < 45) return "ahora mismo";
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHr < 24) return `hace ${diffHr} h`;

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDiff = Math.round(
    (startToday.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (dayDiff === 1) return "ayer";
  if (dayDiff < 7) return `hace ${dayDiff} d`;

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
}
