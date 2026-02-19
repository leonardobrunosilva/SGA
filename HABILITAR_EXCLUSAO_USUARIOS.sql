-- SCRIPT PARA HABILITAR A EXCLUSÃO DE USUÁRIOS POR ADMINISTRADORES
-- Execute este código no "SQL Editor" do seu painel Supabase.

-- 1. Cria a política que permite administradores deletarem qualquer perfil
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;

CREATE POLICY "Admins can delete any profile"
ON public.profiles
FOR DELETE
USING (
    -- Permite se o email no JWT for o do master admin
    auth.jwt() ->> 'email' = 'leonardobruno.silva@gmail.com'
    -- OU se o usuário logado tiver o papel de ADMIN na tabela profiles
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'ADMIN' OR profiles.role = 'admin')
    )
);

-- 2. Recarrega o cache do PostgREST para garantir que a mudança seja aplicada imediatamente
NOTIFY pgrst, 'reload schema';
