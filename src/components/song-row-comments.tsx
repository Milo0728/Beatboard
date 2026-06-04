"use client";

import { useState } from "react";

import { SongCommentThread } from "@/components/song-comment-thread";
import type { CommentItem } from "@/components/comment-thread";

type SongTrackRowProps = {
  songId: string;
  slug: string;
  count: number;
  comments: CommentItem[];
  currentUser: { id: string; displayName: string } | null;
  /** Number of <td> columns the expanded thread row should span. */
  colSpan: number;
  /** Track display label for the accessible aria-label of the toggle. */
  trackLabel: string;
  /** The leading <td> cells from the server-rendered row. */
  children: React.ReactNode;
};

/**
 * Client wrapper that renders a track row plus an optional sibling row
 * containing the inline comment thread when expanded. The toggle button lives
 * in a trailing <td> appended after `children`.
 */
export function SongTrackRow({
  songId,
  slug,
  count,
  comments,
  currentUser,
  colSpan,
  trackLabel,
  children,
}: SongTrackRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr className="transition hover:bg-surface-soft">
        {children}
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={
              open
                ? `Ocultar comentarios de ${trackLabel}`
                : `Mostrar comentarios de ${trackLabel}`
            }
            className="nums inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs text-ink-soft transition hover:border-line-strong hover:bg-surface hover:text-terra-deep"
          >
            <span aria-hidden>💬</span>
            <span>{count}</span>
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="bg-surface-soft/70">
          <td colSpan={colSpan} className="px-4 pb-4 pt-1">
            <SongCommentThread
              songId={songId}
              slug={slug}
              comments={comments}
              currentUser={currentUser}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}
