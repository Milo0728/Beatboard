-- ─────────────────────────────────────────────────────────────────────────────
-- Mirror Supabase auth.users → public.users on sign-up.
--
-- Why this trigger lives outside the Drizzle schema:
-- The auth.users table belongs to Supabase, not our public schema, so Drizzle
-- can't model the trigger declaratively. We keep it in a hand-written
-- migration so it ships with the rest of the schema.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
  v_display  text;
BEGIN
  -- Prefer explicit metadata, fall back to the local part of the email.
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  v_display := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    v_username
  );

  -- Ensure the username is unique by appending a short suffix if needed.
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = v_username) LOOP
    v_username := v_username || '_' || substr(NEW.id::text, 1, 4);
  END LOOP;

  INSERT INTO public.users (id, email, username, display_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    v_username,
    v_display,
    NEW.raw_user_meta_data->>'avatar_url',
    'viewer'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
