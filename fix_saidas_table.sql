-- Add missing receiver and documentation columns to saidas table
ALTER TABLE saidas ADD COLUMN IF NOT EXISTS receiver_name TEXT;
ALTER TABLE saidas ADD COLUMN IF NOT EXISTS receiver_cpf TEXT;
ALTER TABLE saidas ADD COLUMN IF NOT EXISTS auto_infracao TEXT;
ALTER TABLE saidas ADD COLUMN IF NOT EXISTS auto_apreensao TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
