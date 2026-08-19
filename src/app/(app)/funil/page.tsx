import { cookies } from 'next/headers'
import { FunilBoard } from '@/components/funil/funil-board'
import { requireContexto } from '@/lib/contexto'
import { filtrosDoEscopo, resolverVisao } from '@/lib/escopo'
import { agruparEmBlocos, montarCards } from '@/lib/funil-unificado/montar'
import type { AgendamentoRow, PagamentoRow, PropostaRow } from '@/lib/funil-unificado/tipos'
import { janelaDoPeriodo, type Periodo } from '@/lib/periodo'

// A janela é aplicada em memória (cinco datas em três tabelas), então a query traz
// mais do que a tela mostra. Em escala de demo isso é barato; se crescer, o caminho
// é uma view `funil_unificado` com bloco/etapa calculados no banco.
const TETO = 1000

export default async function FunilPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; q?: string }>
}) {
  const { periodo: p, q } = await searchParams
  const periodo: Periodo = p === 'hoje' || p === 'semana' ? p : 'mes'
  const busca = (q ?? '').slice(0, 80)

  const { supabase, profile } = await requireContexto()
  // a visão do seletor do header estreita o escopo dentro do papel
  const escopo = resolverVisao(profile, (await cookies()).get('visao')?.value)
  // pagamentos não têm dono próprio; herdam o escopo pela proposta a que pertencem
  const filtroTime = escopo.tipo === 'global' ? {} : { team_id: escopo.teamId }

  const [agRes, propRes, pagRes] = await Promise.all([
    supabase
      .from('agendamentos')
      .select(
        'id, lead_id, owner_id, titulo, inicio, status, empresa, cpf_cnpj, valor_divida, created_at, updated_at, owner:profiles(nome), lead:leads(nome_cliente, empresa, cpf_cnpj, valor_divida)',
      )
      .match(filtrosDoEscopo(escopo))
      .order('inicio', { ascending: false })
      .limit(TETO),
    supabase
      .from('propostas')
      .select(
        'id, agendamento_id, valor_total_divida, valor_estrategia, espelhamento, enviada_em, data_validade, contrato_status, created_at, token_publico',
      )
      .match(filtrosDoEscopo(escopo))
      .limit(TETO),
    supabase
      .from('fechamento_pagamentos')
      .select('id, proposta_id, valor_pago, data_pagamento, metodo_pagamento, created_at')
      .match(filtroTime)
      .limit(TETO),
  ])

  // Sem isto, uma consulta que falha vira coluna vazia — e "Propostas: 0" mente com
  // cara de verdade. Melhor o quadro admitir que está incompleto.
  const falhas = [
    agRes.error && 'agendamentos',
    propRes.error && 'propostas',
    pagRes.error && 'pagamentos',
  ].filter((v): v is string => typeof v === 'string')

  const cards = montarCards({
    agendamentos: (agRes.data ?? []) as unknown as AgendamentoRow[],
    propostas: (propRes.data ?? []) as PropostaRow[],
    pagamentos: (pagRes.data ?? []) as PagamentoRow[],
    janela: janelaDoPeriodo(periodo),
    busca,
  })

  return (
    <FunilBoard
      blocos={agruparEmBlocos(cards)}
      periodo={periodo}
      busca={busca}
      falhas={falhas}
    />
  )
}
