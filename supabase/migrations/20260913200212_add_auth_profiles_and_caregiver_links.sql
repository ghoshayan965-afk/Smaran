/*
# Add auth: profiles table, caregiver-patient links, and user-scoped RLS

1. Purpose
   Adds multi-user authentication to Smaran. Users sign in as either a "patient"
   or a "caregiver". Caregivers can link to one or more patients and view their
   data from a dashboard.

2. New Tables
   - `profiles`: user role (patient|caregiver) and display name. PK references auth.users.
   - `caregiver_links`: links caregiver to patient (many-to-many).

3. Modified Tables
   - `reminders`, `mood_entries`, `activity_sessions`, `keepsakes`, `chat_messages`,
     `progress`: all get `user_id` column (uuid NOT NULL DEFAULT auth.uid()).
     RLS changed from single-tenant anon policies to owner-scoped + caregiver access.
   - `progress`: old seed row (id=1) removed; now per-user via unique index on user_id.

4. Security
   - RLS on all tables.
   - `profiles`: owner-scoped (read/update own row).
   - `caregiver_links`: caregiver can read/create/delete their own links.
   - Data tables: owner-scoped via auth.uid() = user_id. Caregivers gain SELECT
     access to linked patients' data via caregiver_can_access() SECURITY DEFINER fn.
   - `handle_new_user` trigger auto-creates a profile on signup (role=patient).
*/

-- ============ Remove old single-tenant seed row from progress ============
DELETE FROM progress WHERE id = 1;

-- ============ profiles ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'caregiver')),
  display_name text NOT NULL DEFAULT 'New User',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ============ caregiver_links ============
CREATE TABLE IF NOT EXISTS caregiver_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (caregiver_id, patient_id)
);

ALTER TABLE caregiver_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_caregiver_links" ON caregiver_links;
CREATE POLICY "select_own_caregiver_links" ON caregiver_links FOR SELECT
  TO authenticated USING (auth.uid() = caregiver_id);

DROP POLICY IF EXISTS "insert_own_caregiver_links" ON caregiver_links;
CREATE POLICY "insert_own_caregiver_links" ON caregiver_links FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = caregiver_id);

DROP POLICY IF EXISTS "delete_own_caregiver_links" ON caregiver_links;
CREATE POLICY "delete_own_caregiver_links" ON caregiver_links FOR DELETE
  TO authenticated USING (auth.uid() = caregiver_id);

-- ============ caregiver_can_access function ============
CREATE OR REPLACE FUNCTION caregiver_can_access(target_patient uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM caregiver_links
    WHERE caregiver_id = auth.uid() AND patient_id = target_patient
  );
$$;

-- ============ Add user_id to existing data tables ============

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'user_id') THEN
    ALTER TABLE reminders ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mood_entries' AND column_name = 'user_id') THEN
    ALTER TABLE mood_entries ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_sessions' AND column_name = 'user_id') THEN
    ALTER TABLE activity_sessions ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'keepsakes' AND column_name = 'user_id') THEN
    ALTER TABLE keepsakes ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'user_id') THEN
    ALTER TABLE chat_messages ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress' AND column_name = 'user_id') THEN
    ALTER TABLE progress ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid();
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_user_id ON progress (user_id);

-- ============ Update RLS: reminders ============
DROP POLICY IF EXISTS "anon_select_reminders" ON reminders;
DROP POLICY IF EXISTS "anon_insert_reminders" ON reminders;
DROP POLICY IF EXISTS "anon_update_reminders" ON reminders;
DROP POLICY IF EXISTS "anon_delete_reminders" ON reminders;

DROP POLICY IF EXISTS "select_own_reminders" ON reminders;
CREATE POLICY "select_own_reminders" ON reminders FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR caregiver_can_access(user_id));

DROP POLICY IF EXISTS "insert_own_reminders" ON reminders;
CREATE POLICY "insert_own_reminders" ON reminders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reminders" ON reminders;
CREATE POLICY "update_own_reminders" ON reminders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reminders" ON reminders;
CREATE POLICY "delete_own_reminders" ON reminders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ Update RLS: mood_entries ============
DROP POLICY IF EXISTS "anon_select_mood_entries" ON mood_entries;
DROP POLICY IF EXISTS "anon_insert_mood_entries" ON mood_entries;
DROP POLICY IF EXISTS "anon_update_mood_entries" ON mood_entries;
DROP POLICY IF EXISTS "anon_delete_mood_entries" ON mood_entries;

DROP POLICY IF EXISTS "select_own_mood_entries" ON mood_entries;
CREATE POLICY "select_own_mood_entries" ON mood_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR caregiver_can_access(user_id));

DROP POLICY IF EXISTS "insert_own_mood_entries" ON mood_entries;
CREATE POLICY "insert_own_mood_entries" ON mood_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_mood_entries" ON mood_entries;
CREATE POLICY "update_own_mood_entries" ON mood_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_mood_entries" ON mood_entries;
CREATE POLICY "delete_own_mood_entries" ON mood_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ Update RLS: activity_sessions ============
DROP POLICY IF EXISTS "anon_select_activity_sessions" ON activity_sessions;
DROP POLICY IF EXISTS "anon_insert_activity_sessions" ON activity_sessions;
DROP POLICY IF EXISTS "anon_update_activity_sessions" ON activity_sessions;
DROP POLICY IF EXISTS "anon_delete_activity_sessions" ON activity_sessions;

DROP POLICY IF EXISTS "select_own_activity_sessions" ON activity_sessions;
CREATE POLICY "select_own_activity_sessions" ON activity_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR caregiver_can_access(user_id));

DROP POLICY IF EXISTS "insert_own_activity_sessions" ON activity_sessions;
CREATE POLICY "insert_own_activity_sessions" ON activity_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_activity_sessions" ON activity_sessions;
CREATE POLICY "update_own_activity_sessions" ON activity_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_activity_sessions" ON activity_sessions;
CREATE POLICY "delete_own_activity_sessions" ON activity_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ Update RLS: keepsakes ============
DROP POLICY IF EXISTS "anon_select_keepsakes" ON keepsakes;
DROP POLICY IF EXISTS "anon_insert_keepsakes" ON keepsakes;
DROP POLICY IF EXISTS "anon_update_keepsakes" ON keepsakes;
DROP POLICY IF EXISTS "anon_delete_keepsakes" ON keepsakes;

DROP POLICY IF EXISTS "select_own_keepsakes" ON keepsakes;
CREATE POLICY "select_own_keepsakes" ON keepsakes FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR caregiver_can_access(user_id));

DROP POLICY IF EXISTS "insert_own_keepsakes" ON keepsakes;
CREATE POLICY "insert_own_keepsakes" ON keepsakes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_keepsakes" ON keepsakes;
CREATE POLICY "update_own_keepsakes" ON keepsakes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_keepsakes" ON keepsakes;
CREATE POLICY "delete_own_keepsakes" ON keepsakes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ Update RLS: chat_messages ============
DROP POLICY IF EXISTS "anon_select_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "anon_insert_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "anon_update_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "anon_delete_chat_messages" ON chat_messages;

DROP POLICY IF EXISTS "select_own_chat_messages" ON chat_messages;
CREATE POLICY "select_own_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR caregiver_can_access(user_id));

DROP POLICY IF EXISTS "insert_own_chat_messages" ON chat_messages;
CREATE POLICY "insert_own_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chat_messages" ON chat_messages;
CREATE POLICY "update_own_chat_messages" ON chat_messages FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chat_messages" ON chat_messages;
CREATE POLICY "delete_own_chat_messages" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ Update RLS: progress ============
DROP POLICY IF EXISTS "anon_select_progress" ON progress;
DROP POLICY IF EXISTS "anon_insert_progress" ON progress;
DROP POLICY IF EXISTS "anon_update_progress" ON progress;
DROP POLICY IF EXISTS "anon_delete_progress" ON progress;

DROP POLICY IF EXISTS "select_own_progress" ON progress;
CREATE POLICY "select_own_progress" ON progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR caregiver_can_access(user_id));

DROP POLICY IF EXISTS "insert_own_progress" ON progress;
CREATE POLICY "insert_own_progress" ON progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_progress" ON progress;
CREATE POLICY "update_own_progress" ON progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_progress" ON progress;
CREATE POLICY "delete_own_progress" ON progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ handle_new_user trigger ============
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ updated_at trigger for profiles ============
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
