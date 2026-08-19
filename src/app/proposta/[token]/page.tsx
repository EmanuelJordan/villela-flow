import { format, parseISO } from 'date-fns'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  ApresentacaoProposta,
  type CondicoesComerciais,
} from '@/components/proposta/apresentacao-proposta'
import { BaixarPdfButton } from '@/components/proposta/baixar-pdf-button'
import { calcularParcela, propostaExpirada } from '@/lib/proposta-comercial/calculos'
import { createAdminClient } from '@/lib/supabase/admin'
import { apresentacaoSchema } from '@/lib/validators/proposta-comercial'

// A página vive fora do grupo (app): é a apresentação que o cliente abre pelo
// link, sem sessão. A única chave de acesso é o token — por isso ele é longo,
// aleatório e a busca é por igualdade exata.
const FORMATO_TOKEN = /^prop_[A-Za-z0-9_-]{20,}$/

export const metadata: Metadata = {
  title: 'Proposta Comercial — Villela',
  robots: { index: false, follow: false },
}

export default async function PropostaPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  if (!FORMATO_TOKEN.test(token)) notFound()

  // service role (RLS não se aplica): seleciona apenas o que a página mostra —
  // nada de team_id/lead_id/owner_id saindo do servidor
  const admin = createAdminClient()
  const { data: proposta } = await admin
    .from('propostas')
    .select(
      'valor_estrategia, titulo_estrategia, descricao_estrategia, qtd_parcelas, valor_entrada, data_validade, apresentacao, gerada_em',
    )
    .eq('token_publico', token)
    .maybeSingle()
  if (!proposta) notFound()

  // jsonb estranho degrada para apresentação mínima em vez de derrubar a página
  const parse = apresentacaoSchema.safeParse(proposta.apresentacao)
  const apresentacao = parse.success ? parse.data : null

  const condicoes: CondicoesComerciais = {
    tituloEstrategia: proposta.titulo_estrategia ?? undefined,
    descricaoEstrategia: proposta.descricao_estrategia ?? undefined,
    valorEstrategia: proposta.valor_estrategia,
    qtdParcelas: proposta.qtd_parcelas,
    valorParcela: calcularParcela(
      proposta.valor_estrategia,
      proposta.qtd_parcelas,
      proposta.valor_entrada ?? 0,
    ),
    valorEntrada: proposta.valor_entrada ?? undefined,
    dataValidade: proposta.data_validade ?? undefined,
    geradaEm: proposta.gerada_em ?? undefined,
  }

  const expirada = propostaExpirada(proposta.data_validade)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {expirada && proposta.data_validade && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
        >
          <span className="font-semibold">Esta proposta expirou</span> em{' '}
          {format(parseISO(proposta.data_validade), 'dd/MM/yyyy')} — fale com seu consultor para
          renová-la.
        </div>
      )}

      <ApresentacaoProposta apresentacao={apresentacao} condicoes={condicoes} />

      <div className="mt-4 flex justify-center">
        <BaixarPdfButton apresentacao={apresentacao} condicoes={condicoes} />
      </div>
    </main>
  )
}
