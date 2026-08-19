import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Usuário logado + perfil completo (id, nome, team_id, papel). Redireciona ao
 *  login se deslogado; conta pendente (ou ainda sem equipe) vai para a tela de
 *  aguardando aprovação — o VP libera em /administracao. */
export async function requireContexto() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nome, team_id, papel, status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status !== 'approved' || !profile.team_id) {
    redirect('/aguardando-aprovacao')
  }
  return { supabase, user, profile: { ...profile, team_id: profile.team_id as string } }
}
