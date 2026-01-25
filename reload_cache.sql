-- Force Supabase PostgREST to reload the schema cache
-- This is necessary when new tables or foreign keys are created so the API "sees" them.
NOTIFY pgrst, 'reload schema';

-- Also adding a comment to verify execution and double-trigger metadata refresh
COMMENT ON TABLE worklist_adocao IS 'Worklist Adoção (Cache Reloaded)';
COMMENT ON TABLE worklist_restituicao IS 'Worklist Restituição (Cache Reloaded)';
COMMENT ON TABLE worklist_outros IS 'Worklist Outros Órgãos (Cache Reloaded)';
