-- Corrige erro 42703: coluna daily_habit_goal inexistente.
-- Adiciona a coluna se não existir (banco pode ter sido criado antes da migration original).
ALTER TABLE hexis_user_goals
ADD COLUMN IF NOT EXISTS daily_habit_goal INTEGER NOT NULL DEFAULT 5;

-- Garante que daily_focus_goal existe (caso a tabela tenha sido criada manualmente sem ela)
ALTER TABLE hexis_user_goals
ADD COLUMN IF NOT EXISTS daily_focus_goal INTEGER NOT NULL DEFAULT 60;
