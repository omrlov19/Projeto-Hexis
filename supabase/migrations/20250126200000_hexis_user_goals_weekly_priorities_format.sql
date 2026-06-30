-- weekly_priorities já é JSONB. Formato esperado:
-- [{ "text": "Meta 1", "done": false }, { "text": "Meta 2", "done": true }, ...]
-- Converte registros que ainda estão no formato antigo (array de strings) para o novo formato.

UPDATE hexis_user_goals g
SET weekly_priorities = (
  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN jsonb_typeof(elem) = 'string' THEN jsonb_build_object('text', elem, 'done', false)
        WHEN jsonb_typeof(elem) = 'object' AND elem ? 'text' THEN jsonb_build_object('text', elem->'text', 'done', COALESCE((elem->>'done')::boolean, false))
        ELSE jsonb_build_object('text', '', 'done', false)
      END
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(
    CASE WHEN g.weekly_priorities IS NOT NULL AND jsonb_typeof(g.weekly_priorities) = 'array' THEN g.weekly_priorities ELSE '[]'::jsonb END
  ) AS elem
)
WHERE g.weekly_priorities IS NOT NULL
  AND jsonb_typeof(g.weekly_priorities) = 'array'
  AND jsonb_array_length(g.weekly_priorities) > 0
  AND jsonb_typeof(g.weekly_priorities->0) = 'string';
