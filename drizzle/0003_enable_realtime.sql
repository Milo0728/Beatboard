-- Add the tables the OBS overlay subscribes to (avg_rating updates on
-- albums/songs and active-album changes on live_sessions) to Supabase's
-- realtime publication. Safe to re-run — wrapped in error-swallowing blocks.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.albums;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'albums already in supabase_realtime';
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.songs;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'songs already in supabase_realtime';
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'live_sessions already in supabase_realtime';
END $$;
