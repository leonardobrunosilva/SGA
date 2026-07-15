-- DROP existing tables to clear incorrect schema (BIGINT vs UUID issues)
DROP TABLE IF EXISTS worklist_adocao CASCADE;
DROP TABLE IF EXISTS worklist_restituicao CASCADE;
DROP TABLE IF EXISTS worklist_outros CASCADE;

-- Re-create tables with correct UUID types
-- 1. worklist_adocao
CREATE TABLE worklist_adocao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL, -- Removing FK constraint temporarily to avoid type mismatch if apreensoes key is weird, but usually it's UUID. 
    -- Best practice: animal_id UUID NOT NULL REFERENCES apreensoes(id) ON DELETE CASCADE
    -- I will use the FK because it guarantees integrity.
    -- If this fails, it means apreensoes.id is NOT UUID. But the error showed a UUID input, so it should be fine.
    status TEXT NOT NULL DEFAULT 'Disponível',
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT fk_animal FOREIGN KEY (animal_id) REFERENCES apreensoes(id) ON DELETE CASCADE
);

-- 2. worklist_restituicao
CREATE TABLE worklist_restituicao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'Disponível',
    observations TEXT,
    contact_made BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT fk_animal FOREIGN KEY (animal_id) REFERENCES apreensoes(id) ON DELETE CASCADE
);

-- 3. worklist_outros
CREATE TABLE worklist_outros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'Curral de Apreensão',
    observations TEXT,
    organ_destination TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT fk_animal FOREIGN KEY (animal_id) REFERENCES apreensoes(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE worklist_adocao ENABLE ROW LEVEL SECURITY;
ALTER TABLE worklist_restituicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE worklist_outros ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Enable all access for all users" ON worklist_adocao FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON worklist_restituicao FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON worklist_outros FOR ALL USING (true) WITH CHECK (true);

-- Reload Schema
NOTIFY pgrst, 'reload schema';
