import { addDays } from 'date-fns'
import { obterConexaoGoogle } from '@/actions/google'
import { AgendaLista } from '@/components/agendamento/agenda-lista'
import { AgendamentoForm } from '@/components/agendamento/agendamento-form'
import { cookies } from 'next/headers'
import { requireContexto } from '@/lib/contexto'
import { escopoDoPapel, filtrosDoEscopo, pertenceAoEscopo, resolverVisao } from '@/lib/escopo'

export default async function AgendamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>
}) {
  const { lead: leadId } = await searchParams
  const { supabase, profile } = await requireContexto()
  // a LISTA segue a visão do seletor; a validação do lead pré-selecionado usa
  // o escopo máximo do papel (permissão) — gestor em "meus dados" ainda pode
  // agendar para lead de qualquer membro do time
  const escopo = resolverVisao(profile, (await cookies()).get('visao')?.value)

  const [{ data: agendamentos }, { data: leadPre }, { data: conexao }] = await Promise.all([
    supabase
      .from('agendamentos')
      .select('*, lead:leads(nome_cliente), owner:profiles(nome)')
      .match(filtrosDoEscopo(escopo))
      .gte('inicio', new Date().toISOString())
      .lte('inicio', addDays(new Date(), 7).toISOString())
      .order('inicio'),
    leadId
      ? supabase
          .from('leads')
          .select('id, nome_cliente, empresa, cpf_cnpj, valor_divida, team_id, owner_id')
          .eq('id', leadId)
          .single()
      : Promise.resolve({ data: null }),
    obterConexaoGoogle().then((c) => ({ data: c?.status === 'connected' ? c : null })),
  ])

  // lead fora do alcance do PAPEL (id colado na URL) abre o form vazio, sem erro
  const leadPermitido = leadPre && pertenceAoEscopo(leadPre, escopoDoPapel(profile)) ? leadPre : null

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <div>
        <h1 className="font-display mb-4 text-2xl font-bold">Novo agendamento</h1>
        <AgendamentoForm leadPreSelecionado={leadPermitido} googleConectado={!!conexao} />
      </div>
      <div>
        <h2 className="font-display mb-4 text-lg font-semibold">Próximos 7 dias</h2>
        <AgendaLista agendamentos={agendamentos ?? []} />
      </div>
    </div>
  )
}
