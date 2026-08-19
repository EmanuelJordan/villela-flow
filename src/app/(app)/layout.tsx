import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { SeletorVisao, type OpcaoVisao } from '@/components/layout/seletor-visao'
import { UserMenu } from '@/components/layout/user-menu'
import { normalizarPapel } from '@/lib/escopo'
import { createClient } from '@/lib/supabase/server'

/** Monta as opções do seletor de visão e o valor canônico do cookie atual.
 *  Cookie apontando para algo que não existe mais (equipe/membro removido)
 *  cai no padrão do papel — o mesmo fail-safe do resolverVisao. */
async function montarSeletor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: { id: string; papel: string; team_id: string | null },
  visaoCookie: string | undefined,
): Promise<{ opcoes: OpcaoVisao[]; atual: string; separarApos?: number } | null> {
  const papel = normalizarPapel(profile.papel)

  if (papel === 'vp') {
    const { data: equipes } = await supabase.from('teams').select('id, nome').order('created_at')
    const opcoes: OpcaoVisao[] = [
      { valor: 'todos', rotulo: 'Todas as equipes' },
      ...(equipes ?? []).map((e) => ({ valor: `equipe:${e.id}`, rotulo: e.nome })),
    ]
    const atual = opcoes.some((o) => o.valor === visaoCookie) ? visaoCookie! : 'todos'
    return { opcoes, atual }
  }

  if (papel === 'franqueado_gestor' && profile.team_id) {
    const { data: membros } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('team_id', profile.team_id)
      .in('papel', ['franqueado', 'sdr'])
      .order('nome')
    const opcoes: OpcaoVisao[] = [
      { valor: 'equipe', rotulo: 'Minha equipe' },
      { valor: 'meus', rotulo: 'Meus dados' },
      ...(membros ?? []).map((m) => ({ valor: `membro:${m.id}`, rotulo: m.nome })),
    ]
    const atual = opcoes.some((o) => o.valor === visaoCookie) ? visaoCookie! : 'equipe'
    // separador entre as visões fixas e a lista de membros
    return { opcoes, atual, separarApos: 1 }
  }

  return null // franqueado não escolhe visão
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nome, email, papel, team_id')
    .eq('id', user.id)
    .single()

  const visaoCookie = (await cookies()).get('visao')?.value
  const seletor = profile ? await montarSeletor(supabase, profile, visaoCookie) : null

  return (
    <AppShell
      // a aba é cosmética; a proteção real é o redirect na página + checagem nas actions
      mostrarAdmin={profile?.papel === 'vp'}
      visao={
        seletor && (
          <SeletorVisao atual={seletor.atual} opcoes={seletor.opcoes} separarApos={seletor.separarApos} />
        )
      }
      usuario={<UserMenu nome={profile?.nome ?? 'Usuário'} email={profile?.email ?? user.email ?? ''} />}
    >
      {children}
    </AppShell>
  )
}
