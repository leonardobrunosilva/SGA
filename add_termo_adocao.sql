-- Add termo_adocao column to saidas table
ALTER TABLE saidas ADD COLUMN IF NOT EXISTS termo_adocao TEXT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
