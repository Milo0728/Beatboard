import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";

import { db, schema } from "@/db/client";

type PageProps = { params: Promise<{ slug: string }> };

type ArtistAlbum = {
  id: string;
  title: string;
  slug: string;
  coverUrl: string | null;
  releaseYear: number;
  avgRating: string | null;
  ratingCount: number;
};

async function loadArtist(slug: string) {
  if (!db) return null;
  const [row] = await db
    .select()
    .from(schema.artists)
    .where(eq(schema.artists.slug, slug))
    .limit(1);
  return row ?? null;
}

async function loadArtistAlbums(artistId: string): Promise<ArtistAlbum[]> {
  if (!db) return [];
  return db
    .select({
      id: schema.albums.id,
      title: schema.albums.title,
      slug: schema.albums.slug,
      coverUrl: schema.albums.coverUrl,
      releaseYear: schema.albums.releaseYear,
      avgRating: schema.albums.avgRating,
      ratingCount: schema.albums.ratingCount,
    })
    .from(schema.albums)
    .where(eq(schema.albums.artistId, artistId))
    .orderBy(
      sql`${schema.albums.avgRating} DESC NULLS LAST`,
      desc(schema.albums.releaseYear),
    );
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const artist = await loadArtist(slug);
  if (!artist) return { title: "Artista no encontrado — BeatBoard" };
  return {
    title: `${artist.name} — BeatBoard`,
    description: `Discografía y calificaciones de ${artist.name} en BeatBoard.`,
  };
}

function fmt(avg: string | null): string {
  return avg ? Number(avg).toFixed(1) : "—";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function ArtistPage({ params }: PageProps) {
  const { slug } = await params;
  const artist = await loadArtist(slug);
  if (!artist) notFound();

  const albums = await loadArtistAlbums(artist.id);

  const rated = albums.filter((a) => a.avgRating != null);
  const avgOfRated =
    rated.length > 0
      ? (
          rated.reduce((acc, a) => acc + Number(a.avgRating), 0) / rated.length
        ).toFixed(1)
      : null;
  const totalVotes = albums.reduce((acc, a) => acc + a.ratingCount, 0);

  const stats = [
    { value: String(albums.length), label: albums.length === 1 ? "Álbum" : "Álbumes" },
    { value: avgOfRated ?? "—", label: "Promedio" },
    { value: totalVotes.toLocaleString("es-ES"), label: "Votos" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 py-12 sm:px-8">
      <p className="text-sm">
        <Link
          href="/albums"
          className="font-medium text-ink-soft transition hover:text-terra-deep"
        >
          ← Álbumes
        </Link>
      </p>

      {/* Header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="h-32 w-32 shrink-0 overflow-hidden rounded-3xl border border-line bg-surface-soft shadow-sm sm:h-40 sm:w-40">
          {artist.imageUrl ? (
            <Image
              src={artist.imageUrl}
              alt={artist.name}
              width={320}
              height={320}
              className="h-full w-full object-cover"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-4xl font-bold text-line-strong">
              {getInitials(artist.name)}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terra">
              Artista
            </p>
            <h1 className="mt-2 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              {artist.name}
            </h1>
          </div>

          <dl className="flex flex-wrap gap-x-9 gap-y-3">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col">
                <dt className="order-2 text-xs font-medium uppercase tracking-wider text-muted">
                  {s.label}
                </dt>
                <dd className="nums order-1 font-display text-2xl font-bold text-ink">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {artist.bio ? (
        <p className="max-w-3xl whitespace-pre-wrap text-base leading-relaxed text-ink-soft">
          {artist.bio}
        </p>
      ) : null}

      {/* Discography */}
      <section className="flex flex-col gap-7">
        <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
            Discografía
          </h2>
        </div>

        {albums.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center text-sm text-ink-soft">
            Este artista aún no tiene álbumes en el catálogo.
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {albums.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/albums/${a.slug}`}
                  className="group flex flex-col gap-3"
                >
                  <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-surface-soft shadow-sm transition group-hover:shadow-md">
                    {a.coverUrl ? (
                      <Image
                        src={a.coverUrl}
                        alt={`Portada de ${a.title}`}
                        width={320}
                        height={320}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-line-strong">
                        ♪
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="truncate text-sm font-semibold text-ink transition group-hover:text-terra-deep">
                      {a.title}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted">{a.releaseYear}</span>
                      <span className="nums shrink-0 font-display text-sm font-bold text-terra">
                        {fmt(a.avgRating)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
