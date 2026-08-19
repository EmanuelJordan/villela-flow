-- Proposta Comercial — o assistente de montar proposta e a apresentação pública.
-- A proposta continua sendo a mesma linha que o funil já classifica (enviada_em
-- setado => coluna Propostas); estas colunas só enriquecem o que ela carrega.
-- Propostas do dialog rápido ficam com tudo NULL e a apresentação degrada.

alter table public.propostas
  -- 'prop_' + 24 bytes base64url; null = proposta sem página pública
  add column token_publico text,
  add column titulo_estrategia text,
  add column descricao_estrategia text,
  add column qtd_parcelas smallint not null default 1
    check (qtd_parcelas between 1 and 36),
  add column valor_entrada numeric(14,2)
    check (valor_entrada is null or valor_entrada >= 0),
  -- editável pelo franqueado; base da sugestão de preço
  add column capital_recuperavel numeric(14,2),
  -- snapshot congelado da apresentação { versao: 1, cliente, diagnostico, pgfn,
  -- simulacao } — o cliente vê o que foi enviado, mesmo que o lead mude depois
  add column apresentacao jsonb,
  add column gerada_em timestamptz;

-- Parcial: só propostas com página pública entram no índice; o lookup público
-- é sempre por igualdade de token.
create unique index uq_propostas_token_publico
  on public.propostas(token_publico) where token_publico is not null;

-- Sem policy nova: a página pública lê via service role (createAdminClient),
-- então o papel anon continua sem enxergar nada.
