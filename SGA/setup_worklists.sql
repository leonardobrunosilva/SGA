-- Create tables for Worklists
-- 1. worklist_adocao
CREATE TABLE IF NOT EXISTS worklist_adocao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL REFERENCES apreensoes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Disponível',
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. worklist_restituicao
CREATE TABLE IF NOT EXISTS worklist_restituicao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL REFERENCES apreensoes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Disponível',
    observations TEXT,
    contato_realizado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. worklist_outros
CREATE TABLE IF NOT EXISTS worklist_outros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL REFERENCES apreensoes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Curral de Apreensão',
    observations TEXT,
    organ_destination TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE worklist_adocao ENABLE ROW LEVEL SECURITY;
ALTER TABLE worklist_restituicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE worklist_outros ENABLE ROW LEVEL SECURITY;

-- Create Policies (Public access for now, or authenticated if needed. Using public for simplicity based on previous setup)
-- ADOCAO
CREATE POLICY "Enable all access for all users" ON worklist_adocao
FOR ALL USING (true) WITH CHECK (true);

-- RESTITUICAO
CREATE POLICY "Enable all access for all users" ON worklist_restituicao
FOR ALL USING (true) WITH CHECK (true);

-- OUTROS
CREATE POLICY "Enable all access for all users" ON worklist_outros
FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions (if needed for anon/authenticated roles specifically)
GRANT ALL ON worklist_adocao TO anon;
GRANT ALL ON worklist_adocao TO authenticated;
GRANT ALL ON worklist_adocao TO service_role;

GRANT ALL ON worklist_restituicao TO anon;
GRANT ALL ON worklist_restituicao TO authenticated;
GRANT ALL ON worklist_restituicao TO service_role;

GRANT ALL ON worklist_outros TO anon;
GRANT ALL ON worklist_outros TO authenticated;
GRANT ALL ON worklist_outros TO service_role;
