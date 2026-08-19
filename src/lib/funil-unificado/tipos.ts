/** As sete colunas do quadro. Não existe coluna equivalente no banco: a etapa é
 *  derivada dos dados (ver `classificar.ts`). */
export type Etapa =
  | 'agendado'
  | 'efetiva'
  | 'nao_efetiva'
  | 'proposta_sem_esp'
  | 'proposta_com_esp'
  | 'contrato_nao_pago'
  | 'contrato_pago'

export type Bloco = 'agenda' | 'propostas' | 'contratos'

export const BLOCOS: { id: Bloco; nome: string; etapas: Etapa[] }[] = [
  { id: 'agenda', nome: 'Agenda', etapas: ['agendado', 'efetiva', 'nao_efetiva'] },
  { id: 'propostas', nome: 'Propostas', etapas: ['proposta_sem_esp', 'proposta_com_esp'] },
  { id: 'contratos', nome: 'Contratos', etapas: ['contrato_nao_pago', 'contrato_pago'] },
]

export const ETAPAS: Record<Etapa, { nome: string; cor: string; bloco: Bloco }> = {
  agendado: { nome: 'Agendados', cor: '#55C2E6', bloco: 'agenda' },
  efetiva: { nome: 'Efetivas', cor: '#00BCE5', bloco: 'agenda' },
  nao_efetiva: { nome: 'Não efetivas', cor: '#94a3b8', bloco: 'agenda' },
  proposta_sem_esp: { nome: 'Sem espelhamento', cor: '#3CB5C9', bloco: 'propostas' },
  proposta_com_esp: { nome: 'Com espelhamento', cor: '#116780', bloco: 'propostas' },
  contrato_nao_pago: { nome: 'Não pagos', cor: '#f59e0b', bloco: 'contratos' },
  contrato_pago: { nome: 'Pagos', cor: '#16a34a', bloco: 'contratos' },
}

// ─── Linhas cruas vindas do Supabase ─────────────────────────────────────────

export interface AgendamentoRow {
  id: string
  lead_id: string | null
  owner_id: string | null
  titulo: string
  inicio: string
  status: string
  empresa: string | null
  cpf_cnpj: string | null
  valor_divida: number | null
  created_at: string
  updated_at: string
  owner: { nome: string } | null
  lead: { nome_cliente: string; empresa: string | null; cpf_cnpj: string | null; valor_divida: number | null } | null
}

export interface PropostaRow {
  id: string
  agendamento_id: string
  valor_total_divida: number
  valor_estrategia: number
  espelhamento: boolean
  enviada_em: string | null
  data_validade: string | null
  contrato_status: string
  created_at: string
  /** Presente só em propostas geradas pelo assistente (apresentação pública). */
  token_publico?: string | null
}

export interface PagamentoRow {
  id: string
  proposta_id: string
  valor_pago: number
  data_pagamento: string
  metodo_pagamento: string | null
  created_at: string
}

// ─── Card pronto para a tela ─────────────────────────────────────────────────

export interface CardFunil {
  /** É o id do agendamento: um agendamento = um card, do início ao fim do fluxo. */
  id: string
  etapa: Etapa
  bloco: Bloco
  empresa: string
  cpfCnpj: string | null
  responsavel: string | null
  reuniaoEm: string
  criadoEm: string
  /** O número que a coluna mostra — muda de significado conforme a etapa. */
  valorCard: number | null
  valorDivida: number | null
  proposta: {
    id: string
    valorTotalDivida: number
    valorEstrategia: number
    reducaoPercentual: number
    dataValidade: string | null
    espelhamento: boolean
    contratoStatus: string
    /** Link público da apresentação; null quando a proposta veio do dialog rápido. */
    tokenPublico: string | null
  } | null
  pagamento: { valorPago: number; dataPagamento: string; metodo: string | null } | null
  /** Dias até a proposta vencer; negativo se já venceu. */
  diasParaVencer: number | null
  /** Proposta vencendo em ≤ 2 dias — vira selo no card, não coluna própria. */
  urgente: boolean
}

export interface ColunaFunil {
  etapa: Etapa
  nome: string
  cor: string
  cards: CardFunil[]
  total: number
}

export interface BlocoFunil {
  id: Bloco
  nome: string
  colunas: ColunaFunil[]
  quantidade: number
  total: number
}
