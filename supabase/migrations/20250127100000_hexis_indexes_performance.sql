-- Índices para eliminar lentidão em listagens e filtros por user_id e data.
-- Sem índices, o crescimento dos dados deixa o app exponencialmente mais lento.
-- Usamos DO blocks para criar índices apenas quando a tabela existir.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hexis_habits') THEN
    CREATE INDEX IF NOT EXISTS idx_hexis_habits_user_id ON hexis_habits(user_id);
    CREATE INDEX IF NOT EXISTS idx_hexis_habits_user_created ON hexis_habits(user_id, created_at);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hexis_daily_tracking') THEN
    CREATE INDEX IF NOT EXISTS idx_hexis_daily_tracking_user_date ON hexis_daily_tracking(user_id, date);
  END IF;
END $$;

-- hexis_focus_sessions já possui idx_hexis_focus_sessions_user_created (user_id, created_at)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hexis_planner_items') THEN
    CREATE INDEX IF NOT EXISTS idx_hexis_planner_items_user_id ON hexis_planner_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_hexis_planner_items_user_created ON hexis_planner_items(user_id, created_at);
  END IF;
END $$;
