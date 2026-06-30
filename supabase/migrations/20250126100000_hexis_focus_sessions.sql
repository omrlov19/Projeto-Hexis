-- Sessões de foco (avulsas ou vinculadas a hábito)
CREATE TABLE IF NOT EXISTS hexis_focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER NOT NULL DEFAULT 0,
  habit_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hexis_focus_sessions_user_created
  ON hexis_focus_sessions(user_id, created_at);

ALTER TABLE hexis_focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own focus sessions"
  ON hexis_focus_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus sessions"
  ON hexis_focus_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus sessions"
  ON hexis_focus_sessions FOR UPDATE
  USING (auth.uid() = user_id);
