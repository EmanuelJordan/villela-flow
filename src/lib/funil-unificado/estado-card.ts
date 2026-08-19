import { pertenceAoEscopo, type Escopo } from '@/lib/escopo'
import type { createClient } from '@/lib/supabase/server'
import { classificar } from './classificar'

type Supabase = Awaited<ReturnType<typeof createClient>>

/**
 * Estado atual do card lido do banco. O cliente manda de onde *acha* que partiu,
 * mas quem decide é isto — a tela pode estar desatualizada.
 *
 * O escopo é obrigatório: card fora do alcance (outro dono para franqueado,
 * outro time para gestor) devolve null, como se não existisse — este ponto
 * único protege todas as actions e páginas que operam cards por id.
 */
export async function estadoDoCard(supabase: Supabase, agendamentoId: string, escopo: Escopo) {
  const { data: agendamento } = await supabase
    .from('agendamentos')
    .select('id, status, inicio, team_id, lead_id, owner_id')
    .eq('id', agendamentoId)
    .single()
  if (!agendamento || !pertenceAoEscopo(agendamento, escopo)) return null

  const { data: proposta } = await supabase
    .from('propostas')
    .select('id, espelhamento, enviada_em, contrato_status, token_publico')
    .eq('agendamento_id', agendamentoId)
    .maybeSingle()

  const { data: pagamento } = proposta
    ? await supabase
        .from('fechamento_pagamentos')
        .select('id')
        .eq('proposta_id', proposta.id)
        .limit(1)
        .maybeSingle()
    : { data: null }

  return { agendamento, proposta, pagamento, etapa: classificar(agendamento, proposta, pagamento) }
}
