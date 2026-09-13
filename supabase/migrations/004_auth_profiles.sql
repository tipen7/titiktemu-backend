-- Fase 1: wires the `users` table (added self-contained in 001_init.sql)
-- to real Supabase Auth, per that migration's own note: "Revisit FK to
-- auth.users(id) once Supabase Auth strategy is confirmed." It's confirmed:
-- Supabase Auth owns credentials, this table only holds the app-level
-- profile (role, name) for each auth.users row.

-- Same "mock reconstruction" situation as 002_analytics_mock_schema.sql:
-- the local docker-compose Postgres is plain postgis/postgis, with no
-- Supabase GoTrue and therefore no `auth` schema. These IF NOT EXISTS
-- guards are a no-op against a real Supabase project (where auth.users
-- already exists with its real columns) and only exist so this migration
-- -- and the FK below -- don't fail local dev's fresh `docker compose up`.
-- Nothing in this app writes to this shim auth.users automatically (there's
-- no local GoTrue), so full signup/login still requires pointing
-- DATABASE_URL at the real Supabase project, per .env.example -- this is
-- only here so the schema/trigger themselves can be created and manually
-- tested locally with a plain INSERT.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Supabase Auth manages passwords in auth.users -- this table never sees one.
ALTER TABLE users DROP COLUMN password_hash;

ALTER TABLE users ADD COLUMN full_name text;

-- Re-point id at the real auth user instead of generating its own uuid.
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE users
  ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- Creates the matching public.users row the moment someone signs up via
-- Supabase Auth (frontend calls supabase.auth.signUp with
-- options.data = { role, full_name }). security definer: this runs with
-- the privileges of the function owner, since the invoking session (a
-- brand-new, still-anonymous signup) has no INSERT grant on public.users.
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text := new.raw_user_meta_data ->> 'role';
BEGIN
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (
    new.id,
    new.email,
    CASE
      WHEN requested_role IN ('pemda_admin', 'operator_tod', 'umkm', 'public_user')
        THEN requested_role::user_role
      ELSE 'public_user'::user_role
    END,
    new.raw_user_meta_data ->> 'full_name'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Another local-only shim: auth.uid() is provided by Supabase's PostgREST
-- integration, not by plain Postgres. Guarded so it's a no-op against a
-- real Supabase project, where the real auth.uid() already exists --
-- CREATE OR REPLACE here would be dangerous (it would clobber the real,
-- security-critical function), hence the existence check instead.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
      AS $fn$ SELECT NULL::uuid $fn$;
  END IF;
END $$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);
