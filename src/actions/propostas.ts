'use server'

import { revalidatePath } from 'next/cache'
import { escopoDoPapel, pertenceAoEscopo } from '@/lib/escopo'
import { estadoDoCard } from '@/lib/funil-unificado/estado-card'
import type { Etapa } from '@/lib/funil-unificado/tipos'
import { avaliarTransicao } from '@/lib/funil-unificado/transicoes'
import {
  pagamentoSchema,
  propostaSchema,
  type PagamentoInput,
  type PropostaInput,
} from '@/lib/validators/proposta'
import { requireContexto } from './_contexto'

/** Status da reunião por trás de cada coluna do bloco Agenda. */
const STATUS_DA_ETAPA: Partial<Record<Etapa, string>> = {
  agendado: 'agendado',
  efetiva: 'realizado',
  nao_efetiva: 'nao_compareceu',
}

function revalidar() {
  revalidatePath('/funil')
  revalidatePath('/agendamento')
  revalidatePath('/home')
}

/** Move o card entre colunas que não exigem dado novo. */
export async function moverCardFunil({ agendamentoId, para }: { agendamentoId: string; para: Etapa }) {
  const { supabase, profile } = await requireContexto()
  const estado = await estadoDoCard(supabase, agendamentoId, escopoDoPapel(profile))
  if (!estado?.etapa) return { ok: false as const, erro: 'Card não encontrado.' }
  if (estado.etapa === para) return { ok: true as const }

  const transicao = avaliarTransicao(estado.etapa, para)
  if (transicao.tipo === 'bloqueada') return { ok: false as const, erro: transicao.motivo }
  if (transicao.tipo !== 'direta') {
    // o formulário é quem completa esses casos; chegar aqui é tela dessincronizada
    return { ok: false as const, erro: 'Este movimento precisa dos dados do formulário.' }
  }

  const status = STATUS_DA_ETAPA[para]
  if (status) {
    const { error } = await supabase.from('agendamentos').update({ status }).eq('id', agendamentoId)
    if (error) return { ok: false as const, erro: error.message }
  } else if (!estado.proposta) {
    return { ok: false as const, erro: 'Este card ainda não tem proposta.' }
  } else if (para === 'proposta_sem_esp' || para === 'proposta_com_esp') {
    const { error } = await supabase
      .from('propostas')
      .update({ espelhamento: para === 'proposta_com_esp' })
      .eq('id', estado.proposta.id)
    if (error) return { ok: false as const, erro: error.message }
  } else if (para === 'contrato_nao_pago') {
    const { error } = await supabase
      .from('propostas')
      .update({ contrato_status: 'assinado' })
      .eq('id', estado.proposta.id)
    if (error) return { ok: false as const, erro: error.message }
  }

  revalidar()
  return { ok: true as const }
}

export async function registrarProposta(input: PropostaInput) {
  const parsed = propostaSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, erro: parsed.error.issues[0].message }
  const { supabase, profile } = await requireContexto()

  const estado = await estadoDoCard(supabase, parsed.data.agendamento_id, escopoDoPapel(profile))
  if (!estado?.etapa) return { ok: false as const, erro: 'Card não encontrado.' }
  if (estado.proposta) return { ok: false as const, erro: 'Este card já tem uma proposta.' }
  if (estado.etapa !== 'efetiva') {
    return { ok: false as const, erro: 'Só reunião efetiva vira proposta.' }
  }

  const { error } = await supabase.from('propostas').insert({
    team_id: estado.agendamento.team_id,
    agendamento_id: parsed.data.agendamento_id,
    lead_id: estado.agendamento.lead_id,
    owner_id: profile.id,
    valor_total_divida: parsed.data.valor_total_divida,
    valor_estrategia: parsed.data.valor_estrategia,
    espelhamento: parsed.data.espelhamento,
    data_validade: parsed.data.data_validade ?? null,
    enviada_em: new Date().toISOString(),
  })
  if (error) return { ok: false as const, erro: error.message }

  revalidar()
  return { ok: true as const }
}

export async function registrarPagamento(input: PagamentoInput) {
  const parsed = pagamentoSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, erro: parsed.error.issues[0].message }
  const { supabase, profile } = await requireContexto()

  const { data: proposta } = await supabase
    .from('propostas')
    .select('id, team_id, owner_id, contrato_status')
    .eq('id', parsed.data.proposta_id)
    .single()
  if (!proposta || !pertenceAoEscopo(proposta, escopoDoPapel(profile))) {
    return { ok: false as const, erro: 'Proposta não encontrada.' }
  }

  const { data: jaPago } = await supabase
    .from('fechamento_pagamentos')
    .select('id')
    .eq('proposta_id', proposta.id)
    .limit(1)
    .maybeSingle()
  if (jaPago) return { ok: false as const, erro: 'Esta proposta já tem pagamento registrado.' }

  const { error } = await supabase.from('fechamento_pagamentos').insert({
    team_id: proposta.team_id,
    proposta_id: proposta.id,
    valor_pago: parsed.data.valor_pago,
    data_pagamento: parsed.data.data_pagamento,
    metodo_pagamento: parsed.data.metodo_pagamento || null,
    descricao: parsed.data.descricao || null,
  })
  if (error) return { ok: false as const, erro: error.message }

  // pagamento chegando implica contrato fechado, mesmo que ninguém tenha marcado
  if (proposta.contrato_status !== 'assinado') {
    await supabase.from('propostas').update({ contrato_status: 'assinado' }).eq('id', proposta.id)
  }

  revalidar()
  return { ok: true as const }
}

/** Desfaz o que o arrasto não deixa desfazer. */
export async function desfazerPagamento(propostaId: string) {
  const { supabase, profile } = await requireContexto()

  const { data: proposta } = await supabase
    .from('propostas')
    .select('id, team_id, owner_id')
    .eq('id', propostaId)
    .single()
  if (!proposta || !pertenceAoEscopo(proposta, escopoDoPapel(profile))) {
    return { ok: false as const, erro: 'Proposta não encontrada.' }
  }

  const { error } = await supabase
    .from('fechamento_pagamentos')
    .delete()
    .eq('proposta_id', propostaId)
  if (error) return { ok: false as const, erro: error.message }
  revalidar()
  return { ok: true as const }
}

export async function desfazerProposta(propostaId: string) {
  const { supabase, profile } = await requireContexto()

  const { data: proposta } = await supabase
    .from('propostas')
    .select('id, team_id, owner_id')
    .eq('id', propostaId)
    .single()
  if (!proposta || !pertenceAoEscopo(proposta, escopoDoPapel(profile))) {
    return { ok: false as const, erro: 'Proposta não encontrada.' }
  }

  // o pagamento cai junto pelo `on delete cascade`
  const { data, error } = await supabase.from('propostas').delete().eq('id', propostaId).select('id')
  if (error) return { ok: false as const, erro: error.message }
  if (!data?.length) {
    return { ok: false as const, erro: 'Só quem registrou a proposta pode removê-la.' }
  }
  revalidar()
  return { ok: true as const }
}
