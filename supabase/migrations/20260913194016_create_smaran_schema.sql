/*
# Create Smaran database schema (single-tenant, no auth)

1. Purpose
   Smaran is a dementia care companion app for a single elderly user. There is no
   sign-in screen, so all data is shared/public and accessible via the anon key.
   This migration creates tables for reminders, mood tracking, activity sessions,
   keepsakes (earned rewards), chat history, and progress.

2. New Tables
   - `reminders`: daily gentle reminders (medicine, tasks) with time and completion status.
     Columns: id (uuid PK), title (text), time (text, e.g. "09:00"), completed (bool),
              created_at, updated_at.
   - `mood_entries`: daily mood check-ins (good, okay, low).
     Columns: id (uuid PK), mood (text: good|okay|low), note (text, nullable),
              created_at.
   - `activity_sessions`: records of completed games/activities with scores.
     Columns: id (uuid PK), activity_type (text), score (int, nullable),
              completed (bool), created_at.
   - `keepsakes`: earned sacred relics, trophies, and stars from activities.
     Columns: id (uuid PK), name (text), description (text, nullable),
              icon (text, nullable), earned_at.
   - `chat_messages`: conversation history with the Smaran companion.
     Columns: id (uuid PK), role (text: user|companion), text (text),
              action (text, nullable), created_at.
   - `progress`: single-row progress tracker (level, stars, streaks).
     Columns: id (int PK, always 1), level (int), total_stars (int),
              current_streak (int), longest_streak (int), updated_at.

3. Indexes
   - `idx_reminders_created_at` on reminders(created_at) — for ordering.
   - `idx_mood_entries_created_at` on mood_entries(created_at) — for daily lookups.
   - `idx_activity_sessions_created_at` on activity_sessions(created_at) — for history.
   - `idx_chat_messages_created_at` on chat_messages(created_at) — for conversation order.
   - `idx_keepsakes_earned_at` on keepsakes(earned_at) — for ordering by recency.

4. Security
   - RLS enabled on ALL tables.
   - All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
     because this is a single-tenant app with no sign-in; all data is intentionally
     public/shared. The anon-key frontend must be able to read and write.

5. Notes
   - The `progress` table uses an integer PK (always 1) for a single-row design.
   - A seed row is inserted with default values so the frontend can read it immediately.
   - All timestamps use `timestamptz DEFAULT now()`.
   - `updated_at` columns on reminders and progress auto-update via triggers.
*/

-- ============ reminders ============
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  time text NOT NULL DEFAULT '09:00',
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_reminders" ON reminders;
CREATE POLICY "anon_select_reminders" ON reminders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_reminders" ON reminders;
CREATE POLICY "anon_insert_reminders" ON reminders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_reminders" ON reminders;
CREATE POLICY "anon_update_reminders" ON reminders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_reminders" ON reminders;
CREATE POLICY "anon_delete_reminders" ON reminders FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_reminders_created_at ON reminders (created_at);

-- ============ mood_entries ============
CREATE TABLE IF NOT EXISTS mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mood text NOT NULL CHECK (mood IN ('good', 'okay', 'low')),
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_mood_entries" ON mood_entries;
CREATE POLICY "anon_select_mood_entries" ON mood_entries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_mood_entries" ON mood_entries;
CREATE POLICY "anon_insert_mood_entries" ON mood_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_mood_entries" ON mood_entries;
CREATE POLICY "anon_update_mood_entries" ON mood_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_mood_entries" ON mood_entries;
CREATE POLICY "anon_delete_mood_entries" ON mood_entries FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at ON mood_entries (created_at);

-- ============ activity_sessions ============
CREATE TABLE IF NOT EXISTS activity_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type text NOT NULL,
  score integer,
  completed boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_activity_sessions" ON activity_sessions;
CREATE POLICY "anon_select_activity_sessions" ON activity_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_activity_sessions" ON activity_sessions;
CREATE POLICY "anon_insert_activity_sessions" ON activity_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_activity_sessions" ON activity_sessions;
CREATE POLICY "anon_update_activity_sessions" ON activity_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_activity_sessions" ON activity_sessions;
CREATE POLICY "anon_delete_activity_sessions" ON activity_sessions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_activity_sessions_created_at ON activity_sessions (created_at);

-- ============ keepsakes ============
CREATE TABLE IF NOT EXISTS keepsakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  earned_at timestamptz DEFAULT now()
);

ALTER TABLE keepsakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_keepsakes" ON keepsakes;
CREATE POLICY "anon_select_keepsakes" ON keepsakes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_keepsakes" ON keepsakes;
CREATE POLICY "anon_insert_keepsakes" ON keepsakes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_keepsakes" ON keepsakes;
CREATE POLICY "anon_update_keepsakes" ON keepsakes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_keepsakes" ON keepsakes;
CREATE POLICY "anon_delete_keepsakes" ON keepsakes FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_keepsakes_earned_at ON keepsakes (earned_at);

-- ============ chat_messages ============
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('user', 'companion')),
  text text NOT NULL,
  action text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat_messages" ON chat_messages;
CREATE POLICY "anon_select_chat_messages" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_messages" ON chat_messages;
CREATE POLICY "anon_insert_chat_messages" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chat_messages" ON chat_messages;
CREATE POLICY "anon_update_chat_messages" ON chat_messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat_messages" ON chat_messages;
CREATE POLICY "anon_delete_chat_messages" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages (created_at);

-- ============ progress ============
CREATE TABLE IF NOT EXISTS progress (
  id integer PRIMARY KEY DEFAULT 1,
  level integer NOT NULL DEFAULT 1,
  total_stars integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_progress" ON progress;
CREATE POLICY "anon_select_progress" ON progress FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_progress" ON progress;
CREATE POLICY "anon_insert_progress" ON progress FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_progress" ON progress;
CREATE POLICY "anon_update_progress" ON progress FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_progress" ON progress;
CREATE POLICY "anon_delete_progress" ON progress FOR DELETE
  TO anon, authenticated USING (true);

-- Seed the single progress row
INSERT INTO progress (id, level, total_stars, current_streak, longest_streak)
VALUES (1, 1, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- ============ updated_at triggers ============
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reminders_updated_at ON reminders;
CREATE TRIGGER trg_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_progress_updated_at ON progress;
CREATE TRIGGER trg_progress_updated_at
  BEFORE UPDATE ON progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
