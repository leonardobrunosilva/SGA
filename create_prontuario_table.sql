-- Script para criar a tabela de prontuários clínicos
-- Execute este comando no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.prontuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_chip TEXT NOT NULL,
    type TEXT NOT NULL, -- 'EXAM', 'OCCURRENCE', 'DESTINATION'
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT NOT NULL,
    subtitle TEXT,
    content TEXT,
    result TEXT, -- 'Positivo', 'Negativo'
    icon TEXT DEFAULT 'history_edu',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Segurança)
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso público (seguindo o padrão do projeto)
CREATE POLICY "Permitir acesso total para todos" ON public.prontuarios
FOR ALL USING (true) WITH CHECK (true);

-- Garantir permissões
GRANT ALL ON public.prontuarios TO anon;
GRANT ALL ON public.prontuarios TO authenticated;
GRANT ALL ON public.prontuarios TO service_role;

-- Índice para busca rápida por CHIP
CREATE INDEX IF NOT EXISTS idx_prontuarios_chip ON public.prontuarios(animal_chip);
