import { Hourglass } from 'lucide-react'
import { redirect } from 'next/navigation'
import { sair } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

/** Sala de espera do cadastro: conta nova nasce `pending` e sem equipe — o VP
 *  aprova em /administracao atribuindo papel e time. Fica no grupo (auth) de
 *  propósito: sem AppShell, o usuário pendente não vê navegação nenhuma. */
export default async function AguardandoAprovacaoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // a policy de profiles garante a leitura do próprio registro mesmo pendente
  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, status, team_id')
    .eq('id', user.id)
    .single()

  // acabou de ser aprovado (ou sempre foi): segue o fluxo normal
  if (profile?.status === 'approved' && profile.team_id) redirect('/home')

  return (
    <div className="text-center">
      <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-accent">
        <Hourglass className="size-6 text-[color:var(--villela-teal-escuro)]" />
      </div>
      <h1 className="font-display text-xl font-bold">Cadastro em análise</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {profile?.nome ? `${profile.nome}, seu` : 'Seu'} cadastro está aguardando aprovação da
        vice-presidência. Assim que sua conta for liberada e vinculada a uma equipe, você entra
        direto por aqui.
      </p>
      <form action={sair} className="mt-6">
        <Button type="submit" variant="outline" className="w-full">
          Sair
        </Button>
      </form>
    </div>
  )
}
