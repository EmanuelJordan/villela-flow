-- Villela Flow — schema inicial (demo com preparação para silos por equipe)
create extension if not exists pgcrypto;
create schema if not exists private;

-- ─── Tabelas ────────────────────────────────────────────────────────────────
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text not null default '',
  papel text not null default 'sdr' check (papel in ('gerente','sdr')),
  -- DEMO: default 'approved'. Produção: trocar para 'pending' + fluxo de aprovação.
  status text not null default 'approved' check (status in ('pending','approved')),
  team_id uuid references public.teams(id),
  created_at timestamptz not null default now()
);

create table public.funil_estagios (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  nome text not null,
  ordem int not null,
  cor text,
  is_won boolean not null default false,
  is_lost boolean not null default false
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  owner_id uuid references public.profiles(id),
  estagio_id uuid not null references public.funil_estagios(id),
  posicao int not null default 0,
  nome_cliente text not null,
  empresa text,
  cpf_cnpj text,
  telefone text,
  email text,
  valor_divida numeric(14,2),
  origem text,
  link_diagnostico text,
  diagnostico_dados jsonb,
  diagnostico_status text check (diagnostico_status in ('pendente','extraido','falhou','manual')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  lead_id uuid references public.leads(id) on delete set null,
  owner_id uuid references public.profiles(id),
  titulo text not null,
  descricao text,
  inicio timestamptz not null,
  fim timestamptz not null,
  status text not null default 'agendado'
    check (status in ('agendado','realizado','cancelado','nao_compareceu')),
  google_event_id text,
  meet_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.followups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  lead_id uuid not null references public.leads(id) on delete cascade,
  owner_id uuid references public.profiles(id),
  descricao text not null,
  vence_em timestamptz not null,
  concluido_em timestamptz,
  created_at timestamptz not null default now()
);

create table public.lead_eventos (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.teams(id),
  lead_id uuid not null references public.leads(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  tipo text not null check (tipo in
    ('criado','estagio_alterado','agendamento_criado','followup_concluido','observacao')),
  de_estagio uuid references public.funil_estagios(id),
  para_estagio uuid references public.funil_estagios(id),
  dados jsonb,
  created_at timestamptz not null default now()
);

create table public.google_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_email text,
  refresh_token_encrypted text not null,
  access_token_encrypted text,
  access_token_expires_at timestamptz,
  status text not null default 'connected' check (status in ('connected','disconnected','error')),
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Índices ────────────────────────────────────────────────────────────────
create index idx_profiles_team on public.profiles(team_id);
create index idx_estagios_team on public.funil_estagios(team_id);
create index idx_leads_team on public.leads(team_id);
create index idx_leads_estagio on public.leads(estagio_id);
create index idx_leads_owner on public.leads(owner_id);
create index idx_agendamentos_team on public.agendamentos(team_id);
create index idx_agendamentos_inicio on public.agendamentos(inicio);
create index idx_agendamentos_lead on public.agendamentos(lead_id);
create index idx_followups_team on public.followups(team_id);
create index idx_followups_pendentes on public.followups(vence_em) where concluido_em is null;
create index idx_eventos_team on public.lead_eventos(team_id);
create index idx_eventos_lead on public.lead_eventos(lead_id, created_at);

-- ─── Triggers ───────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_leads_updated before update on public.leads
  for each row execute function public.set_updated_at();
create trigger trg_agendamentos_updated before update on public.agendamentos
  for each row execute function public.set_updated_at();
create trigger trg_google_conn_updated before update on public.google_connections
  for each row execute function public.set_updated_at();

-- Cria profile automaticamente no signup, associado ao team mais antigo (demo: único)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  default_team uuid;
begin
  select id into default_team from public.teams order by created_at limit 1;
  insert into public.profiles (id, nome, email, team_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    default_team
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Preparado para o futuro (silos por equipe) — NÃO usado nas policies da demo ──
create or replace function private.user_team_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select team_id from public.profiles
  where id = auth.uid() and status = 'approved'
$$;
revoke execute on function private.user_team_id() from public, anon;
