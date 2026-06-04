import Link from "next/link";
import { notFound } from "next/navigation";

import { AlbumForm } from "@/components/album-form";
import { requireRole } from "@/lib/auth";
import type { AlbumInput } from "@/lib/validators/album";

import { loadAlbumForEdit, updateAlbum } from "../../actions";

export const metadata = { title: "Editar álbum — Admin BeatBoard" };

type PageProps = { params: Promise<{ slug: string }> };

export default async function EditAlbumPage({ params }: PageProps) {
  const { slug } = await params;
  await requireRole(["admin", "host"], `/admin/albums/${slug}/edit`);

  const album = await loadAlbumForEdit(slug);
  if (!album) notFound();

  async function save(input: AlbumInput) {
    "use server";
    return updateAlbum(slug, input);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <header>
        <p className="text-sm text-muted">
          <Link href="/admin/albums" className="hover:text-terra-deep">
            ← Álbumes
          </Link>
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">Editar álbum</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Modifica los datos del álbum y su tracklist. Si cambia el título o el
          artista, se recalcula el slug.
        </p>
      </header>

      <AlbumForm
        initialValues={{
          title: album.title,
          artistName: album.artistName,
          releaseYear: album.releaseYear,
          coverUrl: album.coverUrl,
          label: album.label,
          genres: album.genres,
          streamEpisodeUrl: album.streamEpisodeUrl,
          tracks: album.tracks,
        }}
        onSave={save}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
