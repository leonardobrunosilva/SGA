-- Migração para adicionar suporte a múltiplos exames no prontuário
-- Execute este comando no SQL Editor do Supabase

ALTER TABLE public.prontuarios 
ADD COLUMN IF NOT EXISTS exam_results JSONB DEFAULT '[]'::jsonb;

-- Comentário para documentar a estrutura da coluna
-- exam_results: [{ "exam": "Tipo do Exame", "result": "Positivo/Negativo" }]
