import { redirect } from 'next/navigation'
import { AprovacoesPendentes } from '@/components/administracao/aprovacoes-pendentes'
import { EquipesSecao } from '@/components/administracao/equipes-secao'
import { MembrosTabela } from '@/components/administracao/membros-tabela'
import { requireContexto } from '@/lib/contexto'

/** Administração de acessos — só o VP entra (a aba escondida é cosmética;
 *  o redirect aqui e a checagem nas actions são a proteção real). */
export default async function AdministracaoPage() {
  const { supabase, profile } = await requireContexto()
  if (profile.papel !== 'vp') redirect('/home')

  // leituras com o token do próprio VP: a policy is_vp() libera todos os profiles
  const [{ data: membros }, { data: equipes }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nome, email, papel, status, team_id, created_at')
      .order('created_at'),
    supabase.from('teams').select('id, nome, created_at').order('created_at'),
  ])

  const todos = membros ?? []
  const pendentes = todos.filter((m) => m.status === 'pending')
  const aprovados = todos.filter((m) => m.status !== 'pending')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Administração</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aprove cadastros e defina papel e equipe de cada membro.
        </p>
      </div>

      {pendentes.length > 0 && <AprovacoesPendentes pendentes={pendentes} equipes={equipes ?? []} />}

      <MembrosTabela membros={aprovados} equipes={equipes ?? []} vpId={profile.id} />

      <EquipesSecao equipes={equipes ?? []} membros={todos} />
    </div>
  )
}
