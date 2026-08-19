'use server'

import { revalidatePath } from 'next/cache'
import { escopoDoPapel, filtrosDoEscopo, pertenceAoEscopo } from '@/lib/escopo'
import {
  agendamentoSchema, remarcarSchema, type AgendamentoInput, type RemarcarInput,
} from '@/lib/validators/agendamento'
import type { Json } from '@/types/database'
import { requireContexto } from './_contexto'

export async function criarAgendamento(input: AgendamentoInput) {
  const parsed = agendamentoSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, erro: parsed.error.issues[0].message }
  const { supabase, profile } = await requireContexto()

  const { data: agendamento, error } = await supabase
    .from('agendamentos')
    .insert({
      team_id: profile.team_id,
      owner_id: profile.id,
      lead_id: parsed.data.lead_id ?? null,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao || null,
      empresa: parsed.data.empresa || null,
      cpf_cnpj: parsed.data.cpf_cnpj || null,
      valor_divida: parsed.data.valor_divida ?? null,
      // jsonb livre — o shape é validado na leitura (prefill/apresentacaoSchema)
      diagnostico_dados: (parsed.data.diagnostico_dados ?? null) as Json,
      inicio: parsed.data.inicio.toISOString(),
      fim: parsed.data.fim.toISOString(),
    })
    .select('id')
    .single()
  if (error || !agendamento) return { ok: false as const, erro: error?.message ?? 'Falha ao agendar' }

  if (parsed.data.lead_id) {
    await supabase.from('lead_eventos').insert({
      team_id: profile.team_id,
      lead_id: parsed.data.lead_id,
      actor_id: profile.id,
      tipo: 'agendamento_criado',
      dados: { agendamento_id: agendamento.id },
    })
  }

  let meetLink: string | undefined
  let avisoGoogle: string | undefined
  if (parsed.data.criar_no_google) {
    try {
      const { createMeetEvent } = await import('@/lib/google/calendar')
      const evento = await createMeetEvent({
        userId: profile.id,
        titulo: parsed.data.titulo,
        descricao: parsed.data.descricao || undefined,
        inicio: parsed.data.inicio,
        fim: parsed.data.fim,
      })
      const { error: errVinculo } = await supabase
        .from('agendamentos')
        .update({ google_event_id: evento.eventId, meet_link: evento.meetLink })
        .eq('id', agendamento.id)
      if (errVinculo) {
        console.error('Falha ao vincular evento Google ao agendamento:', errVinculo.message)
        avisoGoogle = 'Evento criado no Google Calendar, mas não foi possível vinculá-lo ao agendamento.'
      } else {
        meetLink = evento.meetLink ?? undefined
      }
    } catch (err) {
      // falha no Google NÃO desfaz o agendamento local
      avisoGoogle =
        err instanceof Error && err.name === 'GoogleDesconectadoError'
          ? 'Conta Google desconectada — agendamento salvo sem evento no Calendar. Reconecte em Configurações.'
          : 'Não foi possível criar o evento no Google Calendar. Agendamento salvo localmente.'
    }
  }

  revalidatePath('/agendamento')
  revalidatePath('/home')
  revalidatePath('/funil')
  return { ok: true as const, agendamentoId: agendamento.id, meetLink, avisoGoogle }
}

export async function remarcarAgendamento(id: string, input: RemarcarInput) {
  const parsed = remarcarSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, erro: parsed.error.issues[0].message }
  const { supabase, profile } = await requireContexto()

  const { data: ag } = await supabase
    .from('agendamentos')
    .select('google_event_id, owner_id, team_id')
    .eq('id', id)
    .single()
  if (!ag || !pertenceAoEscopo(ag, escopoDoPapel(profile))) {
    return { ok: false as const, erro: 'Agendamento não encontrado.' }
  }

  const { data: atualizados, error } = await supabase
    .from('agendamentos')
    .update({ inicio: parsed.data.inicio.toISOString(), fim: parsed.data.fim.toISOString() })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false as const, erro: error.message }
  if (!atualizados?.length) return { ok: false as const, erro: 'Não foi possível remarcar.' }

  // o evento vive na agenda do organizador — usa o token dele, não o de quem clicou
  let avisoGoogle: string | undefined
  if (ag.google_event_id && ag.owner_id) {
    try {
      const { updateEventTimes } = await import('@/lib/google/calendar')
      await updateEventTimes(ag.owner_id, ag.google_event_id, parsed.data.inicio, parsed.data.fim)
    } catch (err) {
      avisoGoogle =
        err instanceof Error && err.name === 'GoogleDesconectadoError'
          ? 'Remarcado aqui, mas a conta Google está desconectada — o evento no Calendar segue no horário antigo.'
          : 'Remarcado aqui, mas não foi possível atualizar o evento no Google Calendar.'
    }
  }

  revalidatePath('/agendamento')
  revalidatePath('/home')
  revalidatePath('/funil')
  return { ok: true as const, avisoGoogle }
}

export async function excluirAgendamento(id: string) {
  const { supabase, profile } = await requireContexto()

  const { data: ag } = await supabase
    .from('agendamentos')
    .select('google_event_id, owner_id')
    .eq('id', id)
    .single()
  if (!ag) return { ok: false as const, erro: 'Agendamento não encontrado.' }
  // a policy de DELETE já restringe ao dono; checar antes evita apagar o evento
  // do Google e depois descobrir que a linha local não saiu
  if (ag.owner_id !== profile.id) {
    return { ok: false as const, erro: 'Só o organizador da reunião pode excluí-la.' }
  }

  const { error } = await supabase.from('agendamentos').delete().eq('id', id)
  if (error) return { ok: false as const, erro: error.message }

  let avisoGoogle: string | undefined
  if (ag.google_event_id) {
    try {
      const { deleteEvent } = await import('@/lib/google/calendar')
      await deleteEvent(ag.owner_id, ag.google_event_id)
    } catch {
      avisoGoogle = 'Reunião excluída aqui, mas o evento continua no Google Calendar — remova por lá.'
    }
  }

  revalidatePath('/agendamento')
  revalidatePath('/home')
  revalidatePath('/funil')
  return { ok: true as const, avisoGoogle }
}

export async function atualizarStatusAgendamento(
  id: string,
  status: 'agendado' | 'realizado' | 'cancelado' | 'nao_compareceu',
) {
  const { supabase, profile } = await requireContexto()
  // filtro de escopo no próprio update: 0 linhas = fora do alcance
  const { data, error } = await supabase
    .from('agendamentos')
    .update({ status })
    .eq('id', id)
    .match(filtrosDoEscopo(escopoDoPapel(profile)))
    .select('id')
  if (error) return { ok: false as const, erro: error.message }
  if (!data?.length) return { ok: false as const, erro: 'Você não tem acesso a este agendamento.' }

  if (status === 'cancelado') {
    const { data: ag } = await supabase
      .from('agendamentos')
      .select('google_event_id, owner_id')
      .eq('id', id)
      .single()
    if (ag?.google_event_id && ag.owner_id) {
      try {
        const { deleteEvent } = await import('@/lib/google/calendar')
        await deleteEvent(ag.owner_id, ag.google_event_id)
        // limpa o vínculo só no sucesso (preserva retry se o delete falhar)
        await supabase.from('agendamentos').update({ google_event_id: null, meet_link: null }).eq('id', id)
      } catch {
        // best-effort: cancelamento local vale mesmo se o Google falhar
      }
    }
  }

  revalidatePath('/agendamento')
  revalidatePath('/funil')
  return { ok: true as const }
}
