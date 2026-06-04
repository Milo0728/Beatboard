-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-recompute songs.avg_rating / albums.avg_rating whenever the ratings
-- table changes.
--
-- Album average is built from song ratings (rating_type='song') joined through
-- the parent album — matches the plan's spec:
--   promedio_album = AVG(notas_canciones), redondeado al 0.5 más cercano.
--
-- Manual album ratings (rating_type='album_manual') are stored but do NOT
-- override the computed `albums.avg_rating` column at the DB level — the UI
-- can prefer the manual one when it exists.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.round_to_half(v numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN v IS NULL THEN NULL ELSE ROUND(v * 2) / 2.0 END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_song_aggregates(p_song_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.songs s
  SET
    avg_rating = public.round_to_half((
      SELECT AVG(r.score)::numeric
      FROM public.ratings r
      WHERE r.song_id = p_song_id AND r.rating_type = 'song'
    )),
    rating_count = (
      SELECT COUNT(*)
      FROM public.ratings r
      WHERE r.song_id = p_song_id AND r.rating_type = 'song'
    )
  WHERE s.id = p_song_id;
END;
$$;

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
    )
  WHERE a.id = p_album_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_ratings_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_song_id  uuid;
  v_album_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_song_id  := OLD.song_id;
    v_album_id := OLD.album_id;
  ELSE
    v_song_id  := COALESCE(NEW.song_id, OLD.song_id);
    v_album_id := COALESCE(NEW.album_id, OLD.album_id);

    -- Detect a song change in UPDATE (rare but possible) — recompute the old too.
    IF TG_OP = 'UPDATE' AND OLD.song_id IS NOT NULL AND OLD.song_id IS DISTINCT FROM NEW.song_id THEN
      PERFORM public.recompute_song_aggregates(OLD.song_id);
      PERFORM public.recompute_album_aggregates(
        (SELECT album_id FROM public.songs WHERE id = OLD.song_id)
      );
    END IF;
  END IF;

  IF v_song_id IS NOT NULL THEN
    PERFORM public.recompute_song_aggregates(v_song_id);
    PERFORM public.recompute_album_aggregates(
      (SELECT album_id FROM public.songs WHERE id = v_song_id)
    );
  ELSIF v_album_id IS NOT NULL THEN
    PERFORM public.recompute_album_aggregates(v_album_id);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ratings_recompute_aggregates ON public.ratings;
CREATE TRIGGER ratings_recompute_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_ratings_change();

-- Keep ratings.updated_at fresh on edits.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ratings_set_updated_at ON public.ratings;
CREATE TRIGGER ratings_set_updated_at
  BEFORE UPDATE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
