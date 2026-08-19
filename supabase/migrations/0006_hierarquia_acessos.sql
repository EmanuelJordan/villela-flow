-- Hierarquia de acessos: papéis renomeados (franqueado / franqueado_gestor / vp),
-- signup passa a exigir aprovação do VP, e as policies demo_* dão lugar aos
-- silos reais por equipe (com bypass do VP). A distinção owner-dentro-do-time
-- continua na aplicação (src/lib/escopo.ts) — o RLS segrega por equipe.

-- ─── 1) Rename dos papéis ───────────────────────────────────────────────────
alter table public.profiles drop constraint profiles_papel_check;
update public.profiles set papel = 'franqueado'        where papel = 'sdr';
update public.profiles set papel = 'franqueado_gestor' where papel = 'gerente';
alter table public.profiles
  add constraint profiles_papel_check
  check (papel in ('franqueado', 'franqueado_gestor', 'vp'));
alter table public.profiles alter column papel set default 'franqueado';

-- ─── 2) Signup exige aprovação: conta nova nasce pendente e sem equipe ──────
alter table public.profiles alter column status set default 'pending';
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- sem team e pendente: o VP atribui equipe e papel ao aprovar (/administracao)
  insert into public.profiles (id, nome, email, team_id, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    null,
    'pending'
  );
  return new;
end $$;

-- ─── 3) Helpers de RLS ──────────────────────────────────────────────────────
-- VP é papel de visão global: bypass em todas as policies de silo.
create or replace function private.is_vp()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and papel = 'vp' and status = 'approved'
  )
$$;
revoke execute on function private.is_vp() from public, anon;
-- as policies executam como o usuário logado: authenticated PRECISA de
-- usage/execute (0001 revogou de public — sem isto o RLS negaria tudo)
grant usage on schema private to authenticated;
grant execute on function private.user_team_id() to authenticated;
grant execute on function private.is_vp() to authenticated;

-- ─── 4) Silos por equipe nas tabelas de negócio ─────────────────────────────
-- leads
drop policy demo_select_leads on public.leads;
drop policy demo_insert_leads on public.leads;
drop policy demo_update_leads on public.leads;
drop policy demo_delete_leads on public.leads;
create policy silo_select_leads on public.leads
  for select to authenticated
  using (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_insert_leads on public.leads
  for insert to authenticated
  with check (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_update_leads on public.leads
  for update to authenticated
  using      (team_id = (select private.user_team_id()) or (select private.is_vp()))
  with check (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_delete_leads on public.leads
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_vp()));

-- agendamentos
drop policy demo_select_agendamentos on public.agendamentos;
drop policy demo_insert_agendamentos on public.agendamentos;
drop policy demo_update_agendamentos on public.agendamentos;
drop policy demo_delete_agendamentos on public.agendamentos;
create policy silo_select_agendamentos on public.agendamentos
  for select to authenticated
  using (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_insert_agendamentos on public.agendamentos
  for insert to authenticated
  with check (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_update_agendamentos on public.agendamentos
  for update to authenticated
  using      (team_id = (select private.user_team_id()) or (select private.is_vp()))
  with check (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_delete_agendamentos on public.agendamentos
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_vp()));

-- followups
drop policy demo_select_followups on public.followups;
drop policy demo_insert_followups on public.followups;
drop policy demo_update_followups on public.followups;
drop policy demo_delete_followups on public.followups;
create policy silo_select_followups on public.followups
  for select to authenticated
  using (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_insert_followups on public.followups
  for insert to authenticated
  with check (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_update_followups on public.followups
  for update to authenticated
  using      (team_id = (select private.user_team_id()) or (select private.is_vp()))
  with check (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_delete_followups on public.followups
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_vp()));

-- lead_eventos (append-only: sem update/delete, como sempre)
drop policy demo_select_eventos on public.lead_eventos;
drop policy demo_insert_eventos on public.lead_eventos;
create policy silo_select_eventos on public.lead_eventos
  for select to authenticated
  using (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_insert_eventos on public.lead_eventos
  for insert to authenticated
  with check (team_id = (select private.user_team_id()) or (select private.is_vp()));

-- propostas
drop policy demo_select_propostas on public.propostas;
drop policy demo_insert_propostas on public.propostas;
drop policy demo_update_propostas on public.propostas;
drop policy demo_delete_propostas on public.propostas;
create policy silo_select_propostas on public.propostas
  for select to authenticated
  using (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_insert_propostas on public.propostas
  for insert to authenticated
  with check (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_update_propostas on public.propostas
  for update to authenticated
  using      (team_id = (select private.user_team_id()) or (select private.is_vp()))
  with check (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_delete_propostas on public.propostas
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_vp()));

-- fechamento_pagamentos (sem owner_id: o delete — desfazer no painel do card —
-- passa a ser limitado à equipe, antes era qualquer autenticado)
drop policy demo_select_pagamentos on public.fechamento_pagamentos;
drop policy demo_insert_pagamentos on public.fechamento_pagamentos;
drop policy demo_update_pagamentos on public.fechamento_pagamentos;
drop policy demo_delete_pagamentos on public.fechamento_pagamentos;
create policy silo_select_pagamentos on public.fechamento_pagamentos
  for select to authenticated
  using (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_insert_pagamentos on public.fechamento_pagamentos
  for insert to authenticated
  with check (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_update_pagamentos on public.fechamento_pagamentos
  for update to authenticated
  using      (team_id = (select private.user_team_id()) or (select private.is_vp()))
  with check (team_id = (select private.user_team_id()) or (select private.is_vp()));
create policy silo_delete_pagamentos on public.fechamento_pagamentos
  for delete to authenticated
  using (team_id = (select private.user_team_id()) or (select private.is_vp()));

-- ─── 5) profiles: o próprio + o time + o VP ─────────────────────────────────
-- `id = auth.uid()` é obrigatório: o usuário pendente (team null) precisa ler o
-- próprio registro na tela de aguardando aprovação. O ramo do time serve ao
-- ranking do gestor. teams/funil_estagios mantêm select global (catálogo/nomes).
drop policy demo_select_profiles on public.profiles;
create policy silo_select_profiles on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or team_id = (select private.user_team_id())
    or (select private.is_vp())
  );
-- demo_update_proprio_profile permanece: update só de `nome` (grant por coluna)
