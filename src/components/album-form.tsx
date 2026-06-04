"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/toast";
import {
  parseCsv,
  parseDuration,
  type AlbumInput,
} from "@/lib/validators/album";
import type {
  DeezerAlbumDetail,
  DeezerAlbumSearchResult,
} from "@/lib/deezer";

type TrackDraft = {
  uid: string;
  title: string;
  duration: string;
  features: string;
  highlight: boolean;
};

export type AlbumFormInitialValues = {
  title: string;
  artistName: string;
  releaseYear: number;
  coverUrl: string;
  label: string;
  /** Comma-joined */
  genres: string;
  streamEpisodeUrl: string;
  tracks: Array<{
    title: string;
    durationSeconds: number | null;
    featuredArtists: string[];
    isHighlight: boolean;
  }>;
};

export type AlbumFormSaveResult =
  | { ok: true; slug: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type AlbumFormProps = {
  initialValues?: AlbumFormInitialValues;
  onSave: (input: AlbumInput) => Promise<AlbumFormSaveResult>;
  submitLabel?: string;
  /** Redirect target after success. Defaults to `/albums/<slug>`. */
  redirectTo?: (slug: string) => string;
};

const newTrack = (): TrackDraft => ({
  uid: crypto.randomUUID(),
  title: "",
  duration: "",
  features: "",
  highlight: false,
});

function formatSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function initialTracksFrom(
  initial: AlbumFormInitialValues | undefined,
): TrackDraft[] {
  if (!initial || initial.tracks.length === 0) return [newTrack()];
  return initial.tracks.map((t) => ({
    uid: crypto.randomUUID(),
    title: t.title,
    duration: t.durationSeconds != null ? formatSeconds(t.durationSeconds) : "",
    features: t.featuredArtists.join(", "),
    highlight: t.isHighlight,
  }));
}

export function AlbumForm({
  initialValues,
  onSave,
  submitLabel = "Crear álbum",
  redirectTo,
}: AlbumFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [tracks, setTracks] = useState<TrackDraft[]>(() =>
    initialTracksFrom(initialValues),
  );

  // Controlled fields so the Deezer panel can autofill them.
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [artistName, setArtistName] = useState(initialValues?.artistName ?? "");
  const [releaseYear, setReleaseYear] = useState<string>(
    initialValues
      ? String(initialValues.releaseYear)
      : String(new Date().getFullYear()),
  );
  const [label, setLabel] = useState(initialValues?.label ?? "");
  const [coverUrl, setCoverUrl] = useState(initialValues?.coverUrl ?? "");
  const [genres, setGenres] = useState(initialValues?.genres ?? "");
  const [streamEpisodeUrl, setStreamEpisodeUrl] = useState(
    initialValues?.streamEpisodeUrl ?? "",
  );

  // Deezer search state.
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DeezerAlbumSearchResult[] | null>(
    null,
  );
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingAlbumId, setLoadingAlbumId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(!initialValues);
  const searchAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);

  const updateTrack = (uid: string, patch: Partial<TrackDraft>) =>
    setTracks((prev) =>
      prev.map((t) => (t.uid === uid ? { ...t, ...patch } : t)),
    );
  const removeTrack = (uid: string) =>
    setTracks((prev) =>
      prev.length > 1 ? prev.filter((t) => t.uid !== uid) : prev,
    );
  const addTrack = () => setTracks((prev) => [...prev, newTrack()]);

  // Debounced Deezer search.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      // Cancel any in-flight request. Stale results/searching/error are simply
      // not rendered while the query is too short (see the gated JSX below), so
      // we avoid a synchronous setState in the effect body.
      searchAbortRef.current?.abort();
      searchAbortRef.current = null;
      return;
    }

    const handle = setTimeout(() => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setSearching(true);
      setSearchError(null);

      const params = new URLSearchParams({ q: trimmed, limit: "8" });
      fetch(`/api/music/search?${params.toString()}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("HTTP " + res.status);
          const data = (await res.json()) as {
            ok: boolean;
            results?: DeezerAlbumSearchResult[];
            error?: string;
          };
          if (controller.signal.aborted) return;
          if (!data.ok || !Array.isArray(data.results)) {
            throw new Error(data.error ?? "Búsqueda fallida.");
          }
          setResults(data.results);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          setResults([]);
          setSearchError("No se pudo buscar en Deezer.");
        })
        .finally(() => {
          if (controller.signal.aborted) return;
          setSearching(false);
        });
    }, 350);

    return () => clearTimeout(handle);
  }, [query]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
      detailAbortRef.current?.abort();
    };
  }, []);

  async function applyDeezerAlbum(id: number) {
    detailAbortRef.current?.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;
    setLoadingAlbumId(id);
    setSearchError(null);
    try {
      const res = await fetch(`/api/music/album/${id}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = (await res.json()) as {
        ok: boolean;
        album?: DeezerAlbumDetail;
        error?: string;
      };
      if (controller.signal.aborted) return;
      if (!data.ok || !data.album) {
        throw new Error(data.error ?? "No se pudo cargar el álbum.");
      }
      const album = data.album;
      setTitle(album.title);
      setArtistName(album.artist.name);
      if (album.releaseYear !== null) {
        setReleaseYear(String(album.releaseYear));
      }
      setCoverUrl(album.coverUrl ?? "");
      setLabel(album.label ?? "");
      setGenres(album.genres.join(", "));
      const mapped: TrackDraft[] = album.tracks.length
        ? album.tracks.map((t) => ({
            uid: crypto.randomUUID(),
            title: t.title,
            duration: formatSeconds(t.durationSeconds),
            features: (t.featuredArtists ?? []).join(", "),
            highlight: false,
          }))
        : [newTrack()];
      setTracks(mapped);
      // Collapse the search panel and clear the query/results.
      setQuery("");
      setResults(null);
      setPanelOpen(false);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      setSearchError("No se pudo cargar el álbum de Deezer.");
    } finally {
      if (!controller.signal.aborted) {
        setLoadingAlbumId(null);
      }
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const yearNum = Number(releaseYear);

    const input: AlbumInput = {
      title: title.trim(),
      artistName: artistName.trim(),
      releaseYear: Number.isFinite(yearNum) ? yearNum : 0,
      coverUrl: coverUrl.trim() || undefined,
      label: label.trim() || undefined,
      genres: parseCsv(genres),
      streamEpisodeUrl: streamEpisodeUrl.trim() || undefined,
      tracks: tracks
        .filter((t) => t.title.trim().length > 0)
        .map((t, idx) => ({
          trackNumber: idx + 1,
          title: t.title.trim(),
          durationSeconds: parseDuration(t.duration),
          featuredArtists: parseCsv(t.features),
          isHighlight: t.highlight,
        })),
    };

    if (input.tracks.length === 0) {
      toast.error("Falta el tracklist", "Añade al menos una canción con título.");
      return;
    }

    startTransition(async () => {
      const result = await onSave(input);
      if (!result.ok) {
        const fieldMsg = result.fieldErrors
          ? Object.entries(result.fieldErrors)
              .map(([k, v]) => `${k}: ${v?.join(", ")}`)
              .join(" · ")
          : "";
        toast.error(
          result.error,
          fieldMsg.length > 0 ? fieldMsg : undefined,
        );
        return;
      }
      // The toast provider lives in the root layout, so this survives the push.
      toast.success(initialValues ? "Álbum actualizado" : "Álbum guardado");
      const target = redirectTo
        ? redirectTo(result.slug)
        : `/albums/${result.slug}`;
      router.push(target);
    });
  }

  const trimmedQuery = query.trim();
  const showEmptyState =
    panelOpen &&
    trimmedQuery.length >= 2 &&
    !searching &&
    results?.length === 0;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-terra">
              Buscar en Deezer
            </h2>
            <p className="text-sm text-ink-soft">
              Selecciona un álbum y se autocompleta el formulario.
            </p>
          </div>
          {!panelOpen ? (
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="inline-flex h-9 items-center rounded-full border border-line-strong bg-surface px-3 text-xs font-medium text-ink-soft hover:border-terra/40 hover:text-terra-deep"
            >
              Buscar otro
            </button>
          ) : null}
        </div>

        {panelOpen ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className="relative">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busca por artista, álbum…"
                className="h-10 w-full rounded-xl border border-line-strong bg-surface-soft px-3 pr-24 text-ink placeholder:text-muted outline-none transition focus:border-terra"
              />
              {searching && trimmedQuery.length >= 2 ? (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">
                  Buscando…
                </span>
              ) : query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setResults(null);
                    setSearchError(null);
                  }}
                  className="absolute inset-y-0 right-3 my-auto h-6 rounded text-xs text-muted hover:text-ink"
                >
                  Limpiar
                </button>
              ) : null}
            </div>

            {searchError && trimmedQuery.length >= 2 ? (
              <p className="text-sm text-clay">{searchError}</p>
            ) : null}

            {trimmedQuery.length >= 2 && results && results.length > 0 ? (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-soft">
                {results.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    {r.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.coverUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 flex-shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 flex-shrink-0 rounded-md bg-surface-soft" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {r.title}
                      </p>
                      <p className="truncate text-xs text-ink-soft">
                        {r.artist.name}
                        {r.releaseYear ? ` · ${r.releaseYear}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyDeezerAlbum(r.id)}
                      disabled={loadingAlbumId === r.id}
                      className="inline-flex h-8 items-center rounded-full bg-terra px-3 text-xs font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] hover:bg-terra-deep disabled:opacity-60"
                    >
                      {loadingAlbumId === r.id ? "Cargando…" : "Usar"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {showEmptyState ? (
              <p className="text-sm text-muted">Sin resultados.</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Título del álbum"
          name="title"
          required
          maxLength={255}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Field
          label="Artista / Banda"
          name="artistName"
          required
          maxLength={200}
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
        />
        <Field
          label="Año"
          name="releaseYear"
          type="number"
          required
          min={1900}
          max={new Date().getFullYear() + 1}
          value={releaseYear}
          onChange={(e) => setReleaseYear(e.target.value)}
        />
        <Field
          label="Sello"
          name="label"
          maxLength={150}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Field
          label="Portada (URL)"
          name="coverUrl"
          type="url"
          placeholder="https://..."
          className="sm:col-span-2"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
        />
        <Field
          label="Géneros (separados por coma)"
          name="genres"
          placeholder="rock, post-punk, indie"
          className="sm:col-span-2"
          value={genres}
          onChange={(e) => setGenres(e.target.value)}
        />
        <Field
          label="Episodio del stream (URL opcional)"
          name="streamEpisodeUrl"
          type="url"
          placeholder="https://youtu.be/..."
          className="sm:col-span-2"
          value={streamEpisodeUrl}
          onChange={(e) => setStreamEpisodeUrl(e.target.value)}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Tracklist</h2>
            <p className="text-xs text-muted">
              Arrastra el orden no es necesario — el número de pista se asigna
              por posición.
            </p>
          </div>
          <button
            type="button"
            onClick={addTrack}
            className="inline-flex h-9 items-center rounded-full border border-line-strong bg-surface px-3 text-xs font-medium text-ink-soft hover:border-terra/40 hover:text-terra-deep"
          >
            + Añadir canción
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-surface-soft text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="w-10 px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Título</th>
                <th className="w-28 px-3 py-2 text-left">Duración</th>
                <th className="w-56 px-3 py-2 text-left">Features (coma)</th>
                <th className="w-16 px-3 py-2 text-center">★</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {tracks.map((t, idx) => (
                <tr key={t.uid}>
                  <td className="px-3 py-2 text-muted nums">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      value={t.title}
                      onChange={(e) =>
                        updateTrack(t.uid, { title: e.target.value })
                      }
                      placeholder="Título de la canción"
                      className="h-9 w-full rounded-lg border border-line-strong bg-surface-soft px-2 text-ink placeholder:text-muted outline-none focus:border-terra"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={t.duration}
                      onChange={(e) =>
                        updateTrack(t.uid, { duration: e.target.value })
                      }
                      placeholder="3:45"
                      className="h-9 w-full rounded-lg border border-line-strong bg-surface-soft px-2 font-mono text-ink placeholder:text-muted outline-none focus:border-terra"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={t.features}
                      onChange={(e) =>
                        updateTrack(t.uid, { features: e.target.value })
                      }
                      placeholder="invitado 1, invitado 2"
                      className="h-9 w-full rounded-lg border border-line-strong bg-surface-soft px-2 text-ink placeholder:text-muted outline-none focus:border-terra"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={t.highlight}
                      onChange={(e) =>
                        updateTrack(t.uid, { highlight: e.target.checked })
                      }
                      className="h-4 w-4 accent-terra"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeTrack(t.uid)}
                      disabled={tracks.length === 1}
                      className="text-xs text-muted hover:text-clay disabled:opacity-30"
                      aria-label="Eliminar canción"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink-soft hover:border-terra/40 hover:text-terra-deep"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-full bg-terra px-4 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] hover:bg-terra-deep disabled:opacity-60"
        >
          {pending ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  className,
  ...inputProps
}: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={`flex flex-col gap-1.5 text-sm text-ink-soft ${className ?? ""}`}
    >
      {label}
      <input
        {...inputProps}
        className="h-10 rounded-xl border border-line-strong bg-surface-soft px-3 text-ink placeholder:text-muted outline-none transition focus:border-terra"
      />
    </label>
  );
}
