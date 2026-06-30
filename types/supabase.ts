/**
 * MAPEAMENTO DO SCHEMA (Supabase) — Referência para Dashboard e Hábitos
 *
 * O projeto NÃO gera tipos automaticamente do Supabase; este arquivo documenta
 * os nomes EXATOS das tabelas e colunas usados no código (hexis_habits, hexis_daily_tracking).
 *
 * TABELA DE HÁBITOS (definições):
 *   Nome: hexis_habits
 *   Colunas relevantes: id, user_id, title, goal_type, target_value, target_unit,
 *     frequency_days, created_at, position, ...
 *   Data do hábito (quando foi criado): created_at (ISO string)
 *
 * TABELA DE TRACKING DIÁRIO (status por dia):
 *   Nome: hexis_daily_tracking
 *   Colunas: habit_id, user_id, date (YYYY-MM-DD), completed (boolean),
 *     achieved_value, achieved_unit, goal_type, updated_at, ...
 *   Chave única: (habit_id, date) — usada em upsert
 *   Data do dia: coluna "date" (string YYYY-MM-DD) — NÃO created_at
 *
 * SESSÕES DE FOCO:
 *   Tabela: hexis_focus_sessions
 *   Colunas: user_id, duration (segundos), created_at, habit_id (opcional; null = sessão avulsa).
 *   "Tempo de foco do dia" = (soma de achieved_value dos hábitos time em hexis_daily_tracking)
 *   + (soma de duration/60 das sessões de hoje em hexis_focus_sessions onde habit_id IS NULL).
 *
 * GRÁFICO DE CONSISTÊNCIA:
 *   Deve mostrar Porcentagem de Conclusão Diária (0–100) por dia.
 *   Para cada dia: score = (itens concluídos / total de itens do dia) * 100.
 *
 * METAS DO USUÁRIO:
 *   Tabela: hexis_user_goals
 *   Colunas: user_id (PK), daily_focus_goal (integer, minutos), daily_habit_goal (integer, qtd),
 *     weekly_priorities (jsonb, array de strings), updated_at.
 *
 * JOURNAL (entradas por dia):
 *   Tabela: hexis_journal_entries
 *   Colunas: id, user_id, date (YYYY-MM-DD), content (jsonb), created_at.
 *   Chave única: (user_id, date). Para hasJournaledToday: existe registro com date = hoje (Brasília).
 */

export {}
