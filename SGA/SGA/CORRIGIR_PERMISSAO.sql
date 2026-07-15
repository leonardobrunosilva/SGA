-- Copie e cole este código no "SQL Editor" do seu painel Supabase para corrigir o erro de permissão.

-- 1. Habilita a exclusão para usuários que estão logados
create policy "Permitir Exclusão para Usuários Autenticados"
on "public"."apreensoes"
as permissive
for delete
to authenticated
using (true);

-- DICA: Se o comando acima der erro dizendo que a policy já existe, use este comando para ver as policies atuais:
-- select * from pg_policies wheretablename = 'apreensoes';
