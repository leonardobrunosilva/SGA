-- Add 'observations' column if it's missing
ALTER TABLE worklist_adocao ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE worklist_restituicao ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE worklist_outros ADD COLUMN IF NOT EXISTS observations TEXT;

-- Add 'contato_realizado' to restituicao if missing
ALTER TABLE worklist_restituicao ADD COLUMN IF NOT EXISTS contato_realizado BOOLEAN DEFAULT FALSE;

-- Add 'organ_destination' to outros if missing
ALTER TABLE worklist_outros ADD COLUMN IF NOT EXISTS organ_destination TEXT;

-- Reload schema cache again to be sure
NOTIFY pgrst, 'reload schema';
