import Link from "next/link";

import { AlbumForm } from "@/components/album-form";
import { requireRole } from "@/lib/auth";

import { createAlbum } from "../actions";

export const metadata = { title: "Nuevo álbum — Admin BeatBoard" };

export default async function NewAlbumPage() {
  await requireRole(["admin", "host"], "/admin/albums/new");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <header>
        <p className="text-sm text-muted">
          <Link href="/admin/albums" className="hover:text-terra-deep">
            ← Álbumes
          </Link>
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">Nuevo álbum</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Completa los datos del álbum y su tracklist. El artista se crea
          automáticamente si no existe.
        </p>
      </header>

      <AlbumForm onSave={createAlbum} />
    </div>
  );
}
