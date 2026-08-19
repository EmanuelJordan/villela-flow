import { differenceInCalendarDays, parseISO } from 'date-fns'
import { classificar, reducaoPercentual } from './classificar'
import {
  BLOCOS,
  ETAPAS,
  type AgendamentoRow,
  type BlocoFunil,
  type CardFunil,
  type Etapa,
  type PagamentoRow,
  type PropostaRow,
} from './tipos'

/** Proposta vencendo em ≤ 2 dias entra como urgente (mesmo corte do sistema atual). */
const DIAS_URGENTE = 2

export interface Janela {
  inicio: Date
  fim: Date
}

function dentro(janela: Janela, ...datas: (string | null | undefined)[]): boolean {
  const de = janela.inicio.getTime()
  const ate = janela.fim.getTime()
  return datas.some((d) => {
    if (!d) return false
    const t = new Date(d).getTime()
    return !Number.isNaN(t) && t >= de && t <= ate
  })
}

/** Razão social é o melhor identificador; o lead e o título são as redes de segurança. */
function nomeDoCard(a: AgendamentoRow): string {
  const semPrefixo = a.titulo.replace(/^reuni[ãa]o\s*[—–-]\s*/i, '').trim()
  return a.empresa || a.lead?.empresa || a.lead?.nome_cliente || semPrefixo || a.titulo
}

/** O número que a coluna mostra muda de significado ao longo do fluxo. */
function valorDoCard(
  etapa: Etapa,
  valorDivida: number | null,
  proposta: PropostaRow | null,
  pagamento: PagamentoRow | null,
): number | null {
  switch (etapa) {
    case 'contrato_pago':
      return pagamento?.valor_pago ?? null
    case 'contrato_nao_pago':
    case 'proposta_sem_esp':
    case 'proposta_com_esp':
      return proposta?.valor_estrategia ?? null
    default:
      return valorDivida
  }
}

/** Busca tolerante a acento e caixa. */
function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

const soDigitos = (s: string) => s.replace(/\D/g, '')

export function montarCards({
  agendamentos,
  propostas,
  pagamentos,
  janela,
  busca = '',
  agora = new Date(),
}: {
  agendamentos: AgendamentoRow[]
  propostas: PropostaRow[]
  pagamentos: PagamentoRow[]
  janela: Janela
  busca?: string
  agora?: Date
}): CardFunil[] {
  const propostaPorAgendamento = new Map(propostas.map((p) => [p.agendamento_id, p]))
  // um pagamento basta para fechar o card; se houver vários, o primeiro registrado manda
  const pagamentoPorProposta = new Map<string, PagamentoRow>()
  for (const pg of pagamentos) {
    if (!pagamentoPorProposta.has(pg.proposta_id)) pagamentoPorProposta.set(pg.proposta_id, pg)
  }

  const termo = normalizar(busca.trim())
  // CNPJ colado de outro lugar vem pontuado; comparar só os dígitos evita frustração
  const termoDigitos = soDigitos(busca)
  const cards: CardFunil[] = []

  for (const a of agendamentos) {
    const proposta = propostaPorAgendamento.get(a.id) ?? null
    const pagamento = proposta ? (pagamentoPorProposta.get(proposta.id) ?? null) : null

    const etapa = classificar(a, proposta, pagamento, agora)
    if (!etapa) continue

    // "esta semana" = o card se mexeu na semana, não que nasceu nela. Reunião,
    // criação, edição, proposta ou pagamento — qualquer uma serve.
    const relevante = dentro(
      janela,
      a.inicio,
      a.created_at,
      a.updated_at,
      proposta?.created_at,
      pagamento?.created_at,
    )
    if (!relevante) continue

    const empresa = nomeDoCard(a)
    const cpfCnpj = a.cpf_cnpj ?? a.lead?.cpf_cnpj ?? null
    if (termo) {
      const porNome = normalizar(empresa).includes(termo)
      const porDocumento =
        termoDigitos.length >= 3 && soDigitos(cpfCnpj ?? '').includes(termoDigitos)
      if (!porNome && !porDocumento) continue
    }

    const valorDivida = a.valor_divida ?? a.lead?.valor_divida ?? proposta?.valor_total_divida ?? null
    // parseISO, não `new Date`: a coluna é `date` ("2026-07-17") e o construtor a
    // leria como meia-noite UTC — no Brasil isso volta um dia e a proposta pareceria
    // vencer antes da hora.
    const diasParaVencer = proposta?.data_validade
      ? differenceInCalendarDays(parseISO(proposta.data_validade), agora)
      : null

    cards.push({
      id: a.id,
      etapa,
      bloco: ETAPAS[etapa].bloco,
      empresa,
      cpfCnpj,
      responsavel: a.owner?.nome ?? null,
      reuniaoEm: a.inicio,
      criadoEm: a.created_at,
      valorCard: valorDoCard(etapa, valorDivida, proposta, pagamento),
      valorDivida,
      proposta: proposta && {
        id: proposta.id,
        valorTotalDivida: proposta.valor_total_divida,
        valorEstrategia: proposta.valor_estrategia,
        reducaoPercentual: reducaoPercentual(proposta.valor_total_divida, proposta.valor_estrategia),
        dataValidade: proposta.data_validade,
        espelhamento: proposta.espelhamento,
        contratoStatus: proposta.contrato_status,
        tokenPublico: proposta.token_publico ?? null,
      },
      pagamento: pagamento && {
        valorPago: pagamento.valor_pago,
        dataPagamento: pagamento.data_pagamento,
        metodo: pagamento.metodo_pagamento,
      },
      diasParaVencer,
      urgente:
        (etapa === 'proposta_sem_esp' || etapa === 'proposta_com_esp') &&
        diasParaVencer !== null &&
        diasParaVencer <= DIAS_URGENTE,
    })
  }

  return cards
}

/** Agrupa em blocos → colunas, com contagem e soma prontas para o cabeçalho. */
export function agruparEmBlocos(cards: CardFunil[]): BlocoFunil[] {
  const porEtapa = new Map<Etapa, CardFunil[]>()
  for (const c of cards) {
    const lista = porEtapa.get(c.etapa)
    if (lista) lista.push(c)
    else porEtapa.set(c.etapa, [c])
  }

  return BLOCOS.map((bloco) => {
    const colunas = bloco.etapas.map((etapa) => {
      const daEtapa = (porEtapa.get(etapa) ?? []).sort(
        (a, b) => new Date(a.reuniaoEm).getTime() - new Date(b.reuniaoEm).getTime(),
      )
      return {
        etapa,
        nome: ETAPAS[etapa].nome,
        cor: ETAPAS[etapa].cor,
        cards: daEtapa,
        total: daEtapa.reduce((s, c) => s + (c.valorCard ?? 0), 0),
      }
    })
    return {
      id: bloco.id,
      nome: bloco.nome,
      colunas,
      quantidade: colunas.reduce((s, c) => s + c.cards.length, 0),
      total: colunas.reduce((s, c) => s + c.total, 0),
    }
  })
}
