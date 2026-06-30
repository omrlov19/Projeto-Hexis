-- Sessões manuais (check sem timer): podem ser removidas ao desmarcar o hábito
ALTER TABLE hexis_focus_sessions
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN hexis_focus_sessions.is_manual IS 'true = criada ao marcar hábito sem timer; false = do timer real';

-- Permitir que usuários deletem apenas suas próprias sessões (para remover manuais ao desmarcar)
CREATE POLICY "Users can delete own focus sessions"
  ON hexis_focus_sessions FOR DELETE
  USING (auth.uid() = user_id);
