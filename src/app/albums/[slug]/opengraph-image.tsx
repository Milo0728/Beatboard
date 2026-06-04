import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";

import { db, schema } from "@/db/client";

export const alt = "Álbum en BeatBoard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

export default async function AlbumOpengraphImage({ params }: Props) {
  const { slug } = await params;

  let title = "Álbum";
  let artist = "";
  let rating: string | null = null;

  if (db) {
    const [row] = await db
      .select({
        title: schema.albums.title,
        avgRating: schema.albums.avgRating,
        artistName: schema.artists.name,
      })
      .from(schema.albums)
      .innerJoin(schema.artists, eq(schema.albums.artistId, schema.artists.id))
      .where(eq(schema.albums.slug, slug))
      .limit(1);
    if (row) {
      title = row.title;
      artist = row.artistName;
      rating = row.avgRating ? Number(row.avgRating).toFixed(1) : null;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#040415",
          fontFamily: "sans-serif",
        }}
      >
        {/* Left: text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "72px",
          }}
        >
          <div
            style={{
              color: "#be5c2b",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "0.18em",
            }}
          >
            BEATBOARD
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                color: "#ffffff",
                fontSize: 76,
                fontWeight: 800,
                lineHeight: 1.05,
              }}
            >
              {title.length > 48 ? `${title.slice(0, 48)}…` : title}
            </div>
            <div style={{ color: "#9a9aa0", fontSize: 36 }}>{artist}</div>
          </div>

          <div style={{ color: "#9a9aa0", fontSize: 26 }}>
            Calificaciones y reseñas de la audiencia
          </div>
        </div>

        {/* Right: rating chip */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 380,
            backgroundColor: "#0c0c22",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 200,
              fontWeight: 800,
              color: rating ? "#f0ea5a" : "#44444f",
              lineHeight: 1,
            }}
          >
            {rating ?? "—"}
          </div>
          <div style={{ display: "flex", color: "#9a9aa0", fontSize: 30 }}>
            / 10
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
