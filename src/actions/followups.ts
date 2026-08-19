'use server'

import { revalidatePath } from 'next/cache'
import { escopoDoPapel, filtrosDoEscopo } from '@/lib/escopo'
import { requireContexto } from './_contexto'

export async function concluirFollowup(followupId: string, _leadId?: string) {
  const { supabase, profile } = await requireContexto()
  // .is(null) garante idempotência (sem dupla conclusão); lead_id vem da linha, não do cliente.
  // O filtro de escopo no próprio update barra concluir follow-up de outro dono/time.
  const { data, error } = await supabase
    .from('followups')
    .update({ concluido_em: new Date().toISOString() })
    .eq('id', followupId)
    .match(filtrosDoEscopo(escopoDoPapel(profile)))
    .is('concluido_em', null)
    .select('lead_id')
  if (error) return { ok: false as const, erro: error.message }
  if (!data || data.length === 0) {
    return { ok: false as const, erro: 'Follow-up não encontrado ou já concluído.' }
  }

  await supabase.from('lead_eventos').insert({
    team_id: profile.team_id,
    lead_id: data[0].lead_id,
    actor_id: profile.id,
    tipo: 'followup_concluido',
  })
  revalidatePath('/home')
  return { ok: true as const }
}
