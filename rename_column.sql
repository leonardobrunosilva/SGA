-- Rename contact_made to contato_realizado in worklist_restituicao
-- This fixes the error: "could not find the 'contato_realizado' of 'worklist_restituicao' in the schema cache"
-- The React frontend expects 'contato_realizado', but the previous SQL setup used 'contact_made'.

ALTER TABLE worklist_restituicao RENAME COLUMN contact_made TO contato_realizado;

-- Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
