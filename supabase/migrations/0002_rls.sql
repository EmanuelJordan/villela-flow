-- RLS: habilitar em TODAS as tabelas (migrations não habilitam sozinhas)
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.funil_estagios enable row level security;
alter table public.leads enable row level security;
alter table public.agendamentos enable row level security;
alter table public.followups enable row level security;
alter table public.lead_eventos enable row level security;
alter table public.google_connections enable row level security;

-- ─── DEMO: silo único — qualquer autenticado da equipe vê tudo ─────────────
-- FUTURO (silos): trocar os USING/WITH CHECK por `team_id = private.user_team_id()`.

create policy demo_select_teams on public.teams
  for select to authenticated using (true);

create policy demo_select_profiles on public.profiles
  for select to authenticated using (true);
create policy demo_update_proprio_profile on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- papel/status/team_id só mudam via service role (grants por coluna):
revoke update on public.profiles from authenticated;
grant update (nome) on public.profiles to authenticated;

create policy demo_select_estagios on public.funil_estagios
  for select to authenticated using (true);

create policy demo_select_leads on public.leads
  for select to authenticated using ((select auth.uid()) is not null);
create policy demo_insert_leads on public.leads
  for insert to authenticated with check (team_id is not null);
create policy demo_update_leads on public.leads
  for update to authenticated
  using ((select auth.uid()) is not null)
  with check (team_id is not null);
create policy demo_delete_leads on public.leads
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy demo_select_agendamentos on public.agendamentos
  for select to authenticated using ((select auth.uid()) is not null);
create policy demo_insert_agendamentos on public.agendamentos
  for insert to authenticated with check (team_id is not null);
create policy demo_update_agendamentos on public.agendamentos
  for update to authenticated
  using ((select auth.uid()) is not null)
  with check (team_id is not null);
create policy demo_delete_agendamentos on public.agendamentos
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy demo_select_followups on public.followups
  for select to authenticated using ((select auth.uid()) is not null);
create policy demo_insert_followups on public.followups
  for insert to authenticated with check (team_id is not null);
create policy demo_update_followups on public.followups
  for update to authenticated
  using ((select auth.uid()) is not null)
  with check (team_id is not null);
create policy demo_delete_followups on public.followups
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy demo_select_eventos on public.lead_eventos
  for select to authenticated using ((select auth.uid()) is not null);
create policy demo_insert_eventos on public.lead_eventos
  for insert to authenticated with check (team_id is not null);
-- lead_eventos é append-only: sem UPDATE/DELETE.

-- google_connections: RLS ligada e ZERO policies = nega tudo para anon/authenticated.
-- Acesso exclusivamente via secret key (service role) no servidor.
revoke all on public.google_connections from anon, authenticated;
