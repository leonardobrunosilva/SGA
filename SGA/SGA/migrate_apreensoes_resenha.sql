-- Migração para adicionar suporte à Resenha Gráfica (pontos de identificação)
-- Execute este comando no SQL Editor do Supabase

ALTER TABLE public.apreensoes 
ADD COLUMN IF NOT EXISTS resenha_body_marks JSONB DEFAULT '[]'::jsonb;

-- Comentário para documentar a estrutura da coluna
-- resenha_body_marks: [{ "id": number, "x": number, "y": number }]
