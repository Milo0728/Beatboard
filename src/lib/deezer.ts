export type DeezerAlbumSearchResult = {
  id: number;
  title: string;
  coverUrl: string | null;
  artist: { id: number; name: string };
  trackCount: number;
  releaseYear: number | null;
};

export type DeezerAlbumDetail = DeezerAlbumSearchResult & {
  label: string | null;
  genres: string[];
  totalDurationSeconds: number;
  tracks: Array<{
    id: number;
    trackNumber: number;
    title: string;
    featuredArtists: string[];
    durationSeconds: number;
    previewUrl: string | null;
  }>;
};

/**
 * Pull "feat. X / ft. Y / with Z" out of a track title.
 * Deezer doesn't expose per-track contributors on the cheap /album/{id}
 * endpoint, but the title almost always embeds them.
 */
export function extractFeatures(rawTitle: string): {
  cleanTitle: string;
  features: string[];
} {
  const patterns: RegExp[] = [
    // "(feat. X)", "[ft. X & Y]"
    /\s*[\[(]\s*(?:feat\.?|ft\.?|featuring|with)\s+([^\])]+?)\s*[\])]/i,
    // " - feat. X", " - with Y"
    /\s+[-–—]\s+(?:feat\.?|ft\.?|featuring|with)\s+(.+)$/i,
    // trailing "feat. X" with no parens at end
    /\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$/i,
  ];
  for (const re of patterns) {
    const m = rawTitle.match(re);
    if (m) {
      const featStr = m[1].trim().replace(/\s*[\])]+$/, "");
      const features = featStr
        .split(/\s*(?:,|&|\band\b|\bx\b|\bvs\.?\b)\s*/i)
        .map((s) => s.trim())
        .filter(Boolean);
      const cleanTitle = rawTitle.replace(re, "").trim();
      return { cleanTitle, features };
    }
  }
  return { cleanTitle: rawTitle, features: [] };
}

type RawArtist = { id?: unknown; name?: unknown } | null | undefined;

type RawSearchAlbum = {
  id?: unknown;
  title?: unknown;
  cover_xl?: unknown;
  cover_big?: unknown;
  artist?: RawArtist;
  nb_tracks?: unknown;
  release_date?: unknown;
};

type RawSearchResponse = {
  data?: RawSearchAlbum[];
  error?: { code?: number; message?: string; type?: string };
};

type RawTrack = {
  id?: unknown;
  title?: unknown;
  duration?: unknown;
  track_position?: unknown;
  preview?: unknown;
};

type RawGenre = { name?: unknown };

type RawAlbumDetail = RawSearchAlbum & {
  label?: unknown;
  duration?: unknown;
  genres?: { data?: RawGenre[] };
  tracks?: { data?: RawTrack[] };
  error?: { code?: number; message?: string; type?: string };
};

const DEEZER_BASE = "https://api.deezer.com";
const REVALIDATE_SECONDS = 3600;
const TIMEOUT_MS = 8000;

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function pickCover(raw: { cover_xl?: unknown; cover_big?: unknown }): string | null {
  return toStringOrNull(raw.cover_xl) ?? toStringOrNull(raw.cover_big);
}

function parseReleaseYear(value: unknown): number | null {
  if (typeof value !== "string" || value.length < 4) return null;
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function normalizeArtist(raw: RawArtist): { id: number; name: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const id = toNumberOrNull(raw.id);
  const name = toStringOrNull(raw.name);
  if (id === null || name === null) return null;
  return { id, name };
}

function normalizeSearchAlbum(raw: RawSearchAlbum): DeezerAlbumSearchResult | null {
  const id = toNumberOrNull(raw.id);
  const title = toStringOrNull(raw.title);
  const artist = normalizeArtist(raw.artist);
  if (id === null || title === null || !artist) return null;
  return {
    id,
    title,
    coverUrl: pickCover(raw),
    artist,
    trackCount: toNumberOrNull(raw.nb_tracks) ?? 0,
    releaseYear: parseReleaseYear(raw.release_date),
  };
}

function normalizeTracks(raw: RawTrack[] | undefined): DeezerAlbumDetail["tracks"] {
  if (!Array.isArray(raw)) return [];
  const tracks: DeezerAlbumDetail["tracks"] = [];
  raw.forEach((t, index) => {
    const id = toNumberOrNull(t.id);
    const title = toStringOrNull(t.title);
    if (id === null || title === null) return;
    const { cleanTitle, features } = extractFeatures(title);
    tracks.push({
      id,
      trackNumber: toNumberOrNull(t.track_position) ?? index + 1,
      title: cleanTitle,
      featuredArtists: features,
      durationSeconds: toNumberOrNull(t.duration) ?? 0,
      previewUrl: toStringOrNull(t.preview),
    });
  });
  return tracks;
}

function normalizeGenres(raw: { data?: RawGenre[] } | undefined): string[] {
  if (!raw || !Array.isArray(raw.data)) return [];
  return raw.data
    .map((g) => toStringOrNull(g?.name))
    .filter((name): name is string => name !== null);
}

async function deezerFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${DEEZER_BASE}${path}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error("[deezer] fetch failed", path, err);
    return null;
  }
}

export async function searchAlbums(
  query: string,
  limit = 10,
): Promise<DeezerAlbumSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 25);
  const params = new URLSearchParams({ q: trimmed, limit: String(safeLimit) });
  const json = await deezerFetch<RawSearchResponse>(`/search/album?${params.toString()}`);
  if (!json || json.error || !Array.isArray(json.data)) return [];
  const results: DeezerAlbumSearchResult[] = [];
  for (const raw of json.data) {
    const normalized = normalizeSearchAlbum(raw);
    if (normalized) results.push(normalized);
  }
  return results;
}

export async function getAlbum(id: number): Promise<DeezerAlbumDetail | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  const json = await deezerFetch<RawAlbumDetail>(`/album/${Math.floor(id)}`);
  if (!json || json.error) return null;
  const base = normalizeSearchAlbum(json);
  if (!base) return null;
  const tracks = normalizeTracks(json.tracks?.data);
  const totalDurationSeconds =
    toNumberOrNull(json.duration) ??
    tracks.reduce((sum, t) => sum + t.durationSeconds, 0);
  return {
    ...base,
    label: toStringOrNull(json.label),
    genres: normalizeGenres(json.genres),
    totalDurationSeconds,
    tracks,
  };
}
