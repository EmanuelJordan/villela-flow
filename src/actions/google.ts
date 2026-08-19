'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireContexto } from './_contexto'

export async function obterConexaoGoogle() {
  const { user } = await requireContexto()
  const admin = createAdminClient()
  const { data } = await admin
    .from('google_connections')
    .select('google_email, status, created_at')
    .eq('user_id', user.id)
    .maybeSingle()
  return data
}

export async function desconectarGoogle() {
  const { user } = await requireContexto()
  const admin = createAdminClient()
  await admin.from('google_connections').delete().eq('user_id', user.id)
  // revogação best-effort no Google fica a cargo do usuário (myaccount.google.com);
  // a demo apenas remove os tokens locais.
  revalidatePath('/configuracoes')
  revalidatePath('/agendamento')
  return { ok: true as const }
}
