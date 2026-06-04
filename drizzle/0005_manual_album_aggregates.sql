-- ─────────────────────────────────────────────────────────────────────────────
-- "Audience score" for albums.
--
-- Manual album ratings (rating_type='album_manual') were already stored but
-- never aggregated. This adds two denormalized columns on `albums`, kept fresh
-- by the same trigger that maintains the song-derived average, so the UI can
-- show TWO metrics side by side:
--   • avg_rating         → average of the album's SONG ratings  (existing)
--   • manual_avg_rating  → average of the per-user ALBUM ratings (new)
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS manual_avg_rating numeric(3, 1),
  ADD COLUMN IF NOT EXISTS manual_rating_count integer NOT NULL DEFAULT 0;

-- Recompute both the song-derived average AND the manual (audience) average.
-- on_ratings_change() already calls this for album_manual changes (album_id set,
-- song_id null), so no trigger change is needed beyond this function body.
CREATE OR REPLACE FUNCTION public.recompute_album_aggregates(p_album_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.albums a
  SET
    avg_rating = public.round_to_half((
      SELECT AVG(r.score)::numeric
      FROM public.ratings r
      INNER JOIN public.songs s ON s.id = r.song_id
      WHERE s.album_id = p_album_id AND r.rating_type = 'song'
    )),
    rating_count = (
      SELECT COUNT(*)
      FROM public.ratings r
      INNER JOIN public.songs s ON s.id = r.song_id
      WHERE s.album_id = p_album_id AND r.rating_type = 'song'
    ),
    manual_avg_rating = public.round_to_half((
      SELECT AVG(r.score)::numeric
      FROM public.ratings r
      WHERE r.album_id = p_album_id AND r.rating_type = 'album_manual'
    )),
    manual_rating_count = (
      SELECT COUNT(*)
      FROM public.ratings r
      WHERE r.album_id = p_album_id AND r.rating_type = 'album_manual'
    )
  WHERE a.id = p_album_id;
END;
$$;

-- Backfill every existing album with the new manual aggregates.
SELECT public.recompute_album_aggregates(id) FROM public.albums;
