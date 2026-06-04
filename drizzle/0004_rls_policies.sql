-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security for every public table.
--
-- IMPORTANT — why this does NOT break the app:
-- The server (server actions + route handlers) talks to Postgres via
-- DATABASE_URL as the table OWNER role (`postgres`), which BYPASSES RLS because
-- we do NOT use FORCE ROW LEVEL SECURITY. So all server-side reads/writes keep
-- full access. These policies only constrain access made with the public anon
-- key — the browser, Realtime subscriptions, and any direct PostgREST call —
-- closing the hole where anyone holding the (publicly shipped) anon key could
-- read or write every table.
--
--   Reads : public catalog/live state (artists, albums, songs, live_sessions,
--           visible comments) is readable by anyone; private data (users,
--           ratings) only by its owner.
--   Writes: there are NO insert/update/delete policies for anon/authenticated,
--           so every mutation must go through the server. Direct writes with the
--           anon key are denied.
--
-- The OBS overlay subscribes via the anon key to Realtime changes on `albums`
-- and `live_sessions`; Realtime postgres_changes only delivers rows the role
-- can SELECT, so the public-read policies below are what keep the overlay live.
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enable RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- ── Public read: catalog & live state ────────────────────────────────────────
DROP POLICY IF EXISTS "artists_public_read" ON public.artists;
CREATE POLICY "artists_public_read" ON public.artists
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "albums_public_read" ON public.albums;
CREATE POLICY "albums_public_read" ON public.albums
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "songs_public_read" ON public.songs;
CREATE POLICY "songs_public_read" ON public.songs
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "live_sessions_public_read" ON public.live_sessions;
CREATE POLICY "live_sessions_public_read" ON public.live_sessions
  FOR SELECT TO anon, authenticated USING (true);

-- Only non-deleted comments are visible to the public.
DROP POLICY IF EXISTS "comments_public_read" ON public.comments;
CREATE POLICY "comments_public_read" ON public.comments
  FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);

-- ── Owner-only read: private data ────────────────────────────────────────────
-- A user may read their own profile row (protects everyone else's email).
-- `(SELECT auth.uid())` is wrapped in a subselect so Postgres caches it once
-- per statement (Supabase's recommended RLS performance pattern).
DROP POLICY IF EXISTS "users_self_read" ON public.users;
CREATE POLICY "users_self_read" ON public.users
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);

-- A user may read their own ratings; public averages live on albums/songs.
DROP POLICY IF EXISTS "ratings_self_read" ON public.ratings;
CREATE POLICY "ratings_self_read" ON public.ratings
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
