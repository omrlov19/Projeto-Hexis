-- Metas do usuário (uma linha por user_id)
CREATE TABLE IF NOT EXISTS hexis_user_goals (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_focus_goal INTEGER DEFAULT 60,
  daily_habit_goal INTEGER DEFAULT 5,
  weekly_priorities JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE hexis_user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own goals"
  ON hexis_user_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON hexis_user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON hexis_user_goals FOR UPDATE
  USING (auth.uid() = user_id);

-- Entradas de journal (para verificar "journaling de hoje")
CREATE TABLE IF NOT EXISTS hexis_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  content JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_hexis_journal_entries_user_date ON hexis_journal_entries(user_id, date);

ALTER TABLE hexis_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own journal entries"
  ON hexis_journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries"
  ON hexis_journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON hexis_journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries"
  ON hexis_journal_entries FOR DELETE
  USING (auth.uid() = user_id);
