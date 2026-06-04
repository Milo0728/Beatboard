"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  createComment,
  createReply,
  softDeleteComment,
} from "@/app/albums/[slug]/comments/actions";
import { useConfirm } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";

export type CommentItem = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    role: string;
  };
  canDelete: boolean;
  replies?: CommentItem[];
};

type Props = {
  albumId: string;
  slug: string;
  comments: CommentItem[];
  currentUser: { id: string; displayName: string } | null;
};

const MAX_LENGTH = 4000;

export function CommentThread({ albumId, slug, comments, currentUser }: Props) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Reseñas y comentarios
        </h2>
        <span className="text-xs uppercase tracking-wider text-muted">
          {comments.length}{" "}
          {comments.length === 1 ? "comentario" : "comentarios"}
        </span>
      </div>

      {currentUser ? (
        <CommentComposer albumId={albumId} slug={slug} />
      ) : (
        <div className="rounded-3xl border border-line bg-surface p-5 text-center text-sm text-ink-soft shadow-sm">
          <Link
            href={`/login?next=/albums/${slug}`}
            className="font-semibold text-terra-deep hover:text-terra"
          >
            Inicia sesión
          </Link>{" "}
          para comentar.
        </div>
      )}

      {comments.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line-strong bg-surface/60 p-6 text-center text-sm text-muted">
          Aún no hay comentarios. Sé el primero en compartir tu reseña.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id}>
              <CommentRow comment={c} slug={slug} currentUser={currentUser} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentComposer({ albumId, slug }: { albumId: string; slug: string }) {
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
      const result = await createComment(albumId, trimmed, slug);
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
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-line bg-surface p-5 shadow-sm"
    >
      <label
        htmlFor="comment-body"
        className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted"
      >
        Tu comentario
      </label>
      <textarea
        id="comment-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={MAX_LENGTH}
        disabled={pending}
        placeholder="Comparte qué te pareció el álbum..."
        className="w-full resize-y rounded-xl border border-line-strong bg-surface-soft px-3 py-2 text-ink outline-none placeholder:text-muted focus:border-terra disabled:opacity-60"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted">
          <span
            className={
              remaining < 0
                ? "text-clay"
                : remaining < 200
                  ? "text-gold"
                  : ""
            }
          >
            {remaining}
          </span>{" "}
          caracteres restantes
        </div>
        <div className="flex items-center gap-3">
          {error ? (
            <span className="text-xs text-clay" role="alert">
              {error}
            </span>
          ) : null}
          <button
            type="submit"
            disabled={pending || body.trim().length === 0}
            className="h-10 rounded-full bg-terra px-5 font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </div>
    </form>
  );
}

function CommentRow({
  comment,
  slug,
  currentUser,
  isReply = false,
}: {
  comment: CommentItem;
  slug: string;
  currentUser: { id: string; displayName: string } | null;
  isReply?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [replying, setReplying] = useState(false);
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

  const replies = comment.replies ?? [];

  return (
    <article
      className={
        isReply
          ? "rounded-2xl border border-line bg-surface-soft p-4"
          : "rounded-3xl border border-line bg-surface p-5 shadow-sm"
      }
    >
      <header className="flex items-start gap-3">
        <Avatar
          src={comment.author.avatarUrl}
          name={comment.author.displayName}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-semibold text-ink">
              {comment.author.displayName}
            </span>
            <span className="text-xs text-muted">
              @{comment.author.username}
            </span>
            <RoleBadge role={comment.author.role} />
            <span className="text-xs text-muted">·</span>
            <time
              dateTime={comment.createdAt}
              className="text-xs text-muted"
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
            className="text-xs text-muted transition hover:text-clay disabled:opacity-50"
          >
            {pending ? "Eliminando..." : "Eliminar"}
          </button>
        ) : null}
      </header>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">
        {comment.body}
      </p>

      {!isReply && currentUser ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setReplying((v) => !v)}
            className="text-xs font-semibold text-ink-soft transition hover:text-terra-deep"
          >
            {replying ? "Cancelar" : "Responder"}
          </button>
        </div>
      ) : null}

      {!isReply && replying ? (
        <div className="mt-3">
          <ReplyComposer
            parentId={comment.id}
            slug={slug}
            onDone={() => setReplying(false)}
          />
        </div>
      ) : null}

      {!isReply && replies.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3 border-l-2 border-line pl-4">
          {replies.map((r) => (
            <li key={r.id}>
              <CommentRow
                comment={r}
                slug={slug}
                currentUser={currentUser}
                isReply
              />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function ReplyComposer({
  parentId,
  slug,
  onDone,
}: {
  parentId: string;
  slug: string;
  onDone: () => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      setError("Escribe una respuesta.");
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(`Máximo ${MAX_LENGTH} caracteres.`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createReply(parentId, trimmed, slug);
      if (result.ok) {
        setBody("");
        onDone();
        toast.success("Respuesta publicada");
      } else {
        toast.error("No se pudo responder", result.error);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={MAX_LENGTH}
        disabled={pending}
        placeholder="Escribe una respuesta…"
        className="w-full resize-y rounded-xl border border-line-strong bg-surface-soft px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-terra disabled:opacity-60"
      />
      <div className="flex items-center justify-end gap-3">
        {error ? (
          <span className="text-xs text-clay" role="alert">
            {error}
          </span>
        ) : null}
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          className="h-9 rounded-full bg-terra px-4 text-xs font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Enviando…" : "Responder"}
        </button>
      </div>
    </form>
  );
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  const initials = getInitials(name);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Avatar de ${name}`}
        width={40}
        height={40}
        className="h-10 w-10 flex-shrink-0 rounded-full border border-line object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-terra/25 bg-terra-tint text-sm font-semibold text-terra-deep"
    >
      {initials}
    </div>
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
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ${cls}`}
    >
      {role}
    </span>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
