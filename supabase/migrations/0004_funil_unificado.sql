-- Funil Unificado — quadro que cobre da reunião agendada ao contrato pago.
-- A etapa do card NÃO é armazenada: é derivada dos dados (ver src/lib/funil-unificado/
-- classificar.ts). Assim não existe card em "Contrato pago" sem pagamento registrado.

-- ─── Identidade do cliente no agendamento ───────────────────────────────────
-- O agendamento pode nascer sem lead (colando o link do diagnóstico direto na
-- agenda). Sem estas colunas o card do funil ficaria sem nome e sem valor.
alter table public.agendamentos
  add column empresa text,
  add column cpf_cnpj text,
  add column valor_divida numeric(14,2),
  add column diagnostico_dados jsonb;

-- ─── Tabelas ────────────────────────────────────────────────────────────────
create table public.propostas (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  owner_id uuid references public.profiles(id),
  valor_total_divida numeric(14,2) not null,
  -- quanto o cliente efetivamente paga na estratégia
  valor_estrategia numeric(14,2) not null,
  valor_reducao numeric(14,2) generated always as (valor_total_divida - valor_estrategia) stored,
  -- espelhamento = proposta acompanhada pelo jurídico
  espelhamento boolean not null default false,
  enviada_em timestamptz,
  data_validade date,
  contrato_status text not null default 'nenhum'
    check (contrato_status in ('nenhum','enviado','assinado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Um agendamento gera no máximo uma proposta — a classificação em cascata
-- assume isso; duas propostas no mesmo agendamento duplicariam o card.
create unique index uq_propostas_agendamento on public.propostas(agendamento_id);

create table public.fechamento_pagamentos (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  proposta_id uuid not null references public.propostas(id) on delete cascade,
  valor_pago numeric(14,2) not null,
  data_pagamento date not null,
  metodo_pagamento text,
  descricao text,
  created_at timestamptz not null default now()
);

-- ─── Índices ────────────────────────────────────────────────────────────────
create index idx_propostas_team on public.propostas(team_id);
create index idx_propostas_owner on public.propostas(owner_id);
create index idx_propostas_lead on public.propostas(lead_id);
create index idx_pagamentos_team on public.fechamento_pagamentos(team_id);
create index idx_pagamentos_proposta on public.fechamento_pagamentos(proposta_id);

-- ─── Triggers ───────────────────────────────────────────────────────────────
create trigger trg_propostas_updated before update on public.propostas
  for each row execute function public.set_updated_at();

-- ─── RLS (mesmo padrão demo de 0002_rls.sql) ────────────────────────────────
alter table public.propostas enable row level security;
alter table public.fechamento_pagamentos enable row level security;

create policy demo_select_propostas on public.propostas
  for select to authenticated using ((select auth.uid()) is not null);
create policy demo_insert_propostas on public.propostas
  for insert to authenticated with check (team_id is not null);
create policy demo_update_propostas on public.propostas
  for update to authenticated
  using ((select auth.uid()) is not null)
  with check (team_id is not null);
create policy demo_delete_propostas on public.propostas
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy demo_select_pagamentos on public.fechamento_pagamentos
  for select to authenticated using ((select auth.uid()) is not null);
create policy demo_insert_pagamentos on public.fechamento_pagamentos
  for insert to authenticated with check (team_id is not null);
create policy demo_update_pagamentos on public.fechamento_pagamentos
  for update to authenticated
  using ((select auth.uid()) is not null)
  with check (team_id is not null);
-- Arrastar de volta é bloqueado no quadro, então desfazer precisa existir em algum
-- lugar — é o painel do card. Sem esta policy um pagamento errado ficaria preso.
create policy demo_delete_pagamentos on public.fechamento_pagamentos
  for delete to authenticated using ((select auth.uid()) is not null);
