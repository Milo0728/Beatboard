import Image from "next/image";
import Link from "next/link";

import { DeleteAlbumButton } from "@/components/delete-album-button";
import { getCurrentUser } from "@/lib/auth";

import { listAlbums } from "./actions";

export const metadata = { title: "Álbumes — Admin BeatBoard" };

export default async function AdminAlbumsPage() {
  const albums = await listAlbums();
  const current = await getCurrentUser();
  const isAdmin = current?.profile?.role === "admin";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">
            <Link href="/admin" className="hover:text-terra-deep">
              ← Panel
            </Link>
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">Álbumes</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {albums.length === 0
              ? "Aún no hay álbumes. Crea el primero para empezar a calificar."
              : `${albums.length} álbum${albums.length === 1 ? "" : "es"} en el catálogo.`}
          </p>
        </div>
        <Link
          href="/admin/albums/new"
          className="inline-flex h-10 items-center rounded-full bg-terra px-4 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep"
        >
          + Nuevo álbum
        </Link>
      </header>

      {albums.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-2xl">
            💿
          </div>
          <p className="text-sm text-ink-soft">
            El catálogo está vacío. Empieza añadiendo un álbum con su tracklist.
          </p>
          <Link
            href="/admin/albums/new"
            className="inline-flex h-10 items-center rounded-full bg-terra px-4 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] hover:bg-terra-deep"
          >
            Crear primer álbum
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-surface-soft text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 text-left">Álbum</th>
                <th className="px-4 py-3 text-left">Artista</th>
                <th className="px-4 py-3 text-right">Año</th>
                <th className="px-4 py-3 text-right">Tracks</th>
                <th className="px-4 py-3 text-right">Prom.</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {albums.map((a) => (
                <tr key={a.id} className="hover:bg-surface-soft">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {a.coverUrl ? (
                        <Image
                          src={a.coverUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-soft text-muted">
                          ♪
                        </div>
                      )}
                      <span className="font-medium text-ink">{a.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{a.artistName}</td>
                  <td className="px-4 py-3 text-right text-ink-soft nums">{a.releaseYear}</td>
                  <td className="px-4 py-3 text-right text-ink-soft nums">{a.trackCount}</td>
                  <td className="px-4 py-3 text-right">
                    {a.avgRating ? (
                      <span className="nums font-semibold text-terra">
                        {Number(a.avgRating).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/albums/${a.slug}/edit`}
                        className="text-xs font-medium text-ink-soft hover:text-ink"
                      >
                        Editar
                      </Link>
                      {isAdmin ? (
                        <DeleteAlbumButton slug={a.slug} title={a.title} />
                      ) : null}
                      <Link
                        href={`/albums/${a.slug}`}
                        className="text-xs font-medium text-terra hover:text-terra-deep"
                      >
                        Ver →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
