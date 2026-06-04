"use client";

import { useState, useTransition } from "react";

import { deleteAlbum } from "@/app/admin/albums/actions";
import { useConfirm } from "@/components/confirm-dialog";

type Props = {
  slug: string;
  title: string;
};

export function DeleteAlbumButton({ slug, title }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  const onClick = async () => {
    const ok = await confirm({
      title: `Eliminar "${title}"`,
      description:
        "Esto borrará también sus calificaciones y comentarios. No se puede deshacer.",
      confirmText: "Eliminar álbum",
      tone: "danger",
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteAlbum(slug);
        if (result && !result.ok) {
          setError(result.error);
        }
      } catch (err) {
        // Next's redirect() throws internally — swallow if it's the redirect signal.
        if (err && typeof err === "object" && "digest" in err) return;
        console.error("deleteAlbum failed", err);
        setError("Error al eliminar el álbum.");
      }
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="text-xs font-medium text-clay transition hover:text-clay/70 disabled:opacity-50"
      >
        {pending ? "Eliminando..." : "Eliminar"}
      </button>
      {error ? (
        <span className="text-[11px] text-clay" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
