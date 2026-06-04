import { ImageResponse } from "next/og";

export const alt = "BeatBoard — Música, calificada en vivo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#040415",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            color: "#be5c2b",
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "0.18em",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: "#be5c2b",
              color: "#f4f2ed",
              fontSize: 36,
            }}
          >
            B
          </div>
          BEATBOARD
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#ffffff", fontSize: 92, fontWeight: 800, lineHeight: 1.05 }}>
            Música, calificada
          </div>
          <div style={{ color: "#f0ea5a", fontSize: 92, fontWeight: 800, lineHeight: 1.05 }}>
            en vivo.
          </div>
        </div>

        <div style={{ color: "#9a9aa0", fontSize: 32 }}>
          Rankings y crítica musical para canales de reacciones
        </div>
      </div>
    ),
    { ...size },
  );
}
