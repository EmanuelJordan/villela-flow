import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AssistenteProposta } from '@/components/proposta/assistente-proposta'
import { Button } from '@/components/ui/button'
import { requireContexto } from '@/lib/contexto'
import { escopoDoPapel } from '@/lib/escopo'
import { estadoDoCard } from '@/lib/funil-unificado/estado-card'
import { montarPrefill, reidratarForm } from '@/lib/proposta-comercial/prefill'

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">{children}</p>
      <Button variant="outline" className="mt-5" asChild>
        <Link href="/funil">
          <ArrowLeft className="size-4" /> Voltar ao funil
        </Link>
      </Button>
    </div>
  )
}

export default async function MontarPropostaPage({
  params,
}: {
  params: Promise<{ agendamentoId: string }>
}) {
  const { agendamentoId } = await params
  const { supabase, profile, user } = await requireContexto()

  // card fora do escopo = notFound: franqueado não monta proposta do colega
  const estado = await estadoDoCard(supabase, agendamentoId, escopoDoPapel(profile))
  if (!estado?.etapa) notFound()

  // mesmas regras da action — melhor avisar aqui do que falhar no fim do fluxo
  if (!estado.proposta && estado.etapa !== 'efetiva') {
    return <Aviso>Só reunião efetiva vira proposta. Marque a reunião como realizada no funil.</Aviso>
  }
  if (estado.proposta && (estado.etapa === 'contrato_nao_pago' || estado.etapa === 'contrato_pago')) {
    return (
      <Aviso>
        O contrato deste card já foi fechado — a proposta não pode mais ser alterada. Para refazer,
        desfaça primeiro no painel do card.
      </Aviso>
    )
  }

  const [{ data: agendamento }, { data: lead }, { data: proposta }] = await Promise.all([
    supabase
      .from('agendamentos')
      .select('id, titulo, inicio, empresa, cpf_cnpj, valor_divida, diagnostico_dados, lead_id')
      .eq('id', agendamentoId)
      .single(),
    estado.agendamento.lead_id
      ? supabase
          .from('leads')
          .select('nome_cliente, empresa, cpf_cnpj, telefone, valor_divida, diagnostico_dados')
          .eq('id', estado.agendamento.lead_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('propostas')
      .select(
        'valor_total_divida, valor_estrategia, titulo_estrategia, descricao_estrategia, qtd_parcelas, valor_entrada, capital_recuperavel, apresentacao, token_publico',
      )
      .eq('agendamento_id', agendamentoId)
      .maybeSingle(),
  ])
  if (!agendamento) notFound()

  const prefill = montarPrefill({ agendamento, lead: lead ?? null, nomeFranqueado: profile.nome })
  const inicial = proposta ? reidratarForm(prefill, proposta) : prefill

  return (
    <AssistenteProposta
      agendamentoId={agendamento.id}
      inicial={inicial}
      tokenExistente={proposta?.token_publico ?? null}
      emailCloser={user.email ?? ''}
    />
  )
}
