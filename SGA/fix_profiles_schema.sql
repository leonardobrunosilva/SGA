-- FIX FOR MISSING COLUMNS IN 'profiles' AND SETUP 'system_settings'
-- Run this in the Supabase SQL Editor

-- 1. Ensure 'profiles' table has all required columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lotacao TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'USER'; -- USER or ADMIN

-- 2. Create 'system_settings' table if not exists
CREATE TABLE IF NOT EXISTS public.system_settings (
    id SERIAL PRIMARY KEY,
    unidade_data JSONB DEFAULT '{}'::jsonb,
    preferencias JSONB DEFAULT '{}'::jsonb,
    equipe_list JSONB DEFAULT '[]'::jsonb,
    "permissões_matriz" JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.1 Ensure columns exist in case table was created differently before
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS unidade_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS preferencias JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS equipe_list JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS "permissões_matriz" JSONB DEFAULT '[]'::jsonb;

-- 3. Insert initial settings record if it doesn't exist
INSERT INTO public.system_settings (id, unidade_data, "permissões_matriz")
VALUES (1, 
    '{"nome": "Curral Comunitário - SEAGRI DF", "cnpj": "00.111.222/0001-33", "endereco": "Parque de Exposições Granja do Torto, Brasília - DF"}'::jsonb,
    '[
        {"module": "Dashboard & BI", "admin": ["V", "E", "X"], "vet": ["V"], "fiscal": ["V"]},
        {"module": "Prontuário Eletrônico", "admin": ["V", "E", "X"], "vet": ["V", "E", "X"], "fiscal": ["V"]},
        {"module": "Entrada de Animais", "admin": ["V", "E", "X"], "vet": ["V", "E"], "fiscal": ["V", "E", "X"]},
        {"module": "Destinações & Termos", "admin": ["V", "E", "X"], "vet": ["V"], "fiscal": ["V", "E", "X"]},
        {"module": "Configurações do Sistema", "admin": ["V", "E", "X"], "vet": [], "fiscal": []}
    ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET 
    "permissões_matriz" = EXCLUDED."permissões_matriz" 
    WHERE public.system_settings."permissões_matriz" IS NULL OR public.system_settings."permissões_matriz" = '[]'::jsonb;

-- 3.1 Force Master Admin role in profiles table
UPDATE public.profiles SET role = 'ADMIN' WHERE email = 'leonardobruno.silva@gmail.com';

-- 4. Enable RLS and set policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
FOR SELECT USING (true);

-- Allow users to insert/upsert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Allow all authenticated users to read settings
DROP POLICY IF EXISTS "Public settings are viewable by everyone" ON public.system_settings;
CREATE POLICY "Public settings are viewable by everyone" ON public.system_settings
FOR SELECT USING (true);

-- Allow updates to settings for admins
DROP POLICY IF EXISTS "Admins can update settings" ON public.system_settings;
CREATE POLICY "Admins can update settings" ON public.system_settings
FOR UPDATE USING (
    auth.jwt() ->> 'email' = 'leonardobruno.silva@gmail.com'
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'ADMIN' OR profiles.role = 'admin')
    )
);

-- 5. SETUP STORAGE BUCKET (sga-assets)
-- This creates the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('sga-assets', 'sga-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies: Allow anyone to view images
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'sga-assets');

-- Storage Policies: Allow authenticated users to upload to their own folders
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'sga-assets');

-- Allow users to update/delete their own uploads (optional but good practice)
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
CREATE POLICY "Users can update their own images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'sga-assets');

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
