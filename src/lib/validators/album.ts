import { z } from "zod";

const currentYear = new Date().getFullYear();

export const trackInputSchema = z.object({
  trackNumber: z.number().int().positive().max(999),
  title: z.string().trim().min(1, "Título requerido").max(255),
  durationSeconds: z
    .number()
    .int()
    .positive()
    .max(60 * 60 * 3) // 3h hard cap
    .nullable()
    .optional(),
  featuredArtists: z.array(z.string().trim().min(1)).max(20).default([]),
  isHighlight: z.boolean().default(false),
});

export const albumInputSchema = z.object({
  title: z.string().trim().min(1, "Título requerido").max(255),
  artistName: z.string().trim().min(1, "Artista requerido").max(200),
  releaseYear: z
    .number()
    .int()
    .min(1900, "Año debe ser ≥ 1900")
    .max(currentYear + 1, "Año fuera de rango"),
  coverUrl: z.string().url("URL inválida").optional().or(z.literal("").transform(() => undefined)),
  label: z.string().trim().max(150).optional().or(z.literal("").transform(() => undefined)),
  genres: z.array(z.string().trim().min(1)).max(10).default([]),
  streamEpisodeUrl: z
    .string()
    .url("URL inválida")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  tracks: z.array(trackInputSchema).min(1, "Añade al menos una canción").max(60),
});

export type AlbumInput = z.infer<typeof albumInputSchema>;
export type TrackInput = z.infer<typeof trackInputSchema>;

/**
 * Parses the comma-separated string used in form inputs (genres / features)
 * into a clean array. "rock, post-punk ,  " → ["rock", "post-punk"]
 */
export function parseCsv(input: string | undefined | null): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** "mm:ss" or "hh:mm:ss" → seconds. Returns null for empty/invalid. */
export function parseDuration(input: string | undefined | null): number | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 1) return parts[0];
  return null;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
