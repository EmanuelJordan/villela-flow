import 'server-only'
import { eachDayOfInterval, format, isSameDay, subWeeks } from 'date-fns'
import { matrizAtividade } from '@/lib/atividade'
import { filtrosDoEscopo, type Escopo } from '@/lib/escopo'
import { rangeDoPeriodo, type Periodo } from '@/lib/periodo'
import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

export async function calcularMetricas(supabase: Supabase, periodo: Periodo, escopo: Escopo) {
  const { inicio, fim } = rangeDoPeriodo(periodo)
  const agora = new Date()

  const [
    { data: estagios },
    { data: agends },
    { data: eventos },
    { data: leadsPorEstagio },
    { data: eventosHeatmap },
  ] = await Promise.all([
    supabase.from('funil_estagios').select('id, nome, cor, is_won, is_lost, ordem').order('ordem'),
    supabase
      .from('agendamentos')
      .select('id, created_at')
      .match(filtrosDoEscopo(escopo))
      .gte('created_at', inicio.toISOString())
      .lte('created_at', fim.toISOString()),
    supabase
      .from('lead_eventos')
      .select('tipo, para_estagio, created_at')
      .match(filtrosDoEscopo(escopo, { colunaOwner: 'actor_id' }))
      .gte('created_at', inicio.toISOString())
      .lte('created_at', fim.toISOString()),
    supabase.from('leads').select('estagio_id, valor_divida, origem').match(filtrosDoEscopo(escopo)),
    // heatmap tem janela própria (8 semanas), independente do seletor de período
    supabase
      .from('lead_eventos')
      .select('created_at')
      .match(filtrosDoEscopo(escopo, { colunaOwner: 'actor_id' }))
      .gte('created_at', subWeeks(agora, 8).toISOString()),
  ])

  const idsWon = new Set((estagios ?? []).filter((e) => e.is_won).map((e) => e.id))
  const idProposta = (estagios ?? []).find((e) => e.nome === 'Proposta Enviada')?.id

  // 'criado' também conta: lead criado direto em "Proposta Enviada"/"Fechado" entra nas métricas
  const mudancas = (eventos ?? []).filter((e) => e.tipo === 'estagio_alterado' || e.tipo === 'criado')
  const propostas = mudancas.filter((e) => e.para_estagio === idProposta)
  const fechamentos = mudancas.filter((e) => e.para_estagio && idsWon.has(e.para_estagio))
  const leadsCriados = (eventos ?? []).filter((e) => e.tipo === 'criado')

  const dias = eachDayOfInterval({ start: inicio, end: fim })
  const porDia = dias.map((d) => ({
    dia: format(d, 'dd/MM'),
    agendamentos: (agends ?? []).filter((a) => isSameDay(new Date(a.created_at), d)).length,
    fechamentos: fechamentos.filter((f) => isSameDay(new Date(f.created_at), d)).length,
  }))

  const porEstagio = (estagios ?? []).map((e) => ({
    nome: e.nome,
    cor: e.cor as string | null,
    qtd: (leadsPorEstagio ?? []).filter((l) => l.estagio_id === e.id).length,
  }))

  // pipeline ativo = soma da dívida dos leads em estágios ainda abertos
  const idsAbertos = new Set(
    (estagios ?? []).filter((e) => !e.is_won && !e.is_lost).map((e) => e.id),
  )
  const pipelineAtivo = (leadsPorEstagio ?? [])
    .filter((l) => idsAbertos.has(l.estagio_id))
    .reduce((soma, l) => soma + (l.valor_divida != null ? Number(l.valor_divida) : 0), 0)

  const origens = new Map<string, number>()
  for (const l of leadsPorEstagio ?? []) {
    const chave = l.origem ?? 'Outros'
    origens.set(chave, (origens.get(chave) ?? 0) + 1)
  }
  const porOrigem = [...origens.entries()]
    .map(([origem, qtd]) => ({ origem, qtd }))
    .sort((a, b) => b.qtd - a.qtd)

  return {
    agendamentos: (agends ?? []).length,
    propostas: propostas.length,
    fechamentos: fechamentos.length,
    leadsCriados: leadsCriados.length,
    taxaConversao:
      leadsCriados.length > 0 ? Math.round((fechamentos.length / leadsCriados.length) * 100) : 0,
    pipelineAtivo,
    porDia,
    porEstagio,
    porOrigem,
    atividade: matrizAtividade((eventosHeatmap ?? []).map((e) => e.created_at), agora),
  }
}
