import { describe, expect, it } from 'vitest'
import { agruparEmBlocos, montarCards } from '@/lib/funil-unificado/montar'
import { janelaDoPeriodo } from '@/lib/periodo'
import type { AgendamentoRow, PagamentoRow, PropostaRow } from '@/lib/funil-unificado/tipos'

const AGORA = new Date('2026-07-15T10:00:00-03:00') // quarta-feira

function agendamento(over: Partial<AgendamentoRow> = {}): AgendamentoRow {
  return {
    id: 'ag1',
    lead_id: null,
    owner_id: 'u1',
    titulo: 'Reunião — PADARIA DO ZE LTDA',
    inicio: '2026-07-15T14:00:00-03:00',
    status: 'agendado',
    empresa: 'PADARIA DO ZE LTDA',
    cpf_cnpj: '12345678000195',
    valor_divida: 340_000,
    created_at: '2026-07-14T09:00:00-03:00',
    updated_at: '2026-07-14T09:00:00-03:00',
    owner: { nome: 'Mariana Jordão' },
    lead: null,
    ...over,
  }
}

function proposta(over: Partial<PropostaRow> = {}): PropostaRow {
  return {
    id: 'p1',
    agendamento_id: 'ag1',
    valor_total_divida: 340_000,
    valor_estrategia: 118_000,
    espelhamento: false,
    enviada_em: '2026-07-15T11:00:00-03:00',
    data_validade: '2026-07-30',
    contrato_status: 'nenhum',
    created_at: '2026-07-15T11:00:00-03:00',
    ...over,
  }
}

function pagamento(over: Partial<PagamentoRow> = {}): PagamentoRow {
  return {
    id: 'pg1',
    proposta_id: 'p1',
    valor_pago: 118_000,
    data_pagamento: '2026-07-15',
    metodo_pagamento: 'PIX',
    created_at: '2026-07-15T16:00:00-03:00',
    ...over,
  }
}

const semana = janelaDoPeriodo('semana', AGORA)

const montar = (args: Partial<Parameters<typeof montarCards>[0]> = {}) =>
  montarCards({
    agendamentos: [agendamento()],
    propostas: [],
    pagamentos: [],
    janela: semana,
    agora: AGORA,
    ...args,
  })

describe('montarCards — janela de período', () => {
  it('inclui reunião futura da mesma semana', () => {
    const cards = montar({
      agendamentos: [agendamento({ inicio: '2026-07-17T14:00:00-03:00' })],
    })
    expect(cards).toHaveLength(1)
  })

  it('exclui card cujas datas ficaram todas fora da janela', () => {
    const antigo = agendamento({
      inicio: '2026-05-02T14:00:00-03:00',
      created_at: '2026-05-01T09:00:00-03:00',
      updated_at: '2026-05-01T09:00:00-03:00',
    })
    expect(montar({ agendamentos: [antigo] })).toHaveLength(0)
  })

  it('reunião antiga volta ao quadro se o pagamento entrou na janela', () => {
    const antigo = agendamento({
      inicio: '2026-05-02T14:00:00-03:00',
      created_at: '2026-05-01T09:00:00-03:00',
      updated_at: '2026-05-01T09:00:00-03:00',
    })
    const cards = montar({
      agendamentos: [antigo],
      propostas: [proposta({ created_at: '2026-05-03T10:00:00-03:00' })],
      pagamentos: [pagamento()],
    })
    expect(cards).toHaveLength(1)
    expect(cards[0].etapa).toBe('contrato_pago')
  })

  it('só a edição do agendamento na janela já traz o card', () => {
    const editado = agendamento({
      inicio: '2026-05-02T14:00:00-03:00',
      created_at: '2026-05-01T09:00:00-03:00',
      updated_at: '2026-07-15T08:00:00-03:00',
    })
    expect(montar({ agendamentos: [editado] })).toHaveLength(1)
  })
})

describe('montarCards — conteúdo do card', () => {
  it('o valor exibido muda conforme a etapa', () => {
    expect(montar()[0].valorCard).toBe(340_000)

    const comProposta = montar({ propostas: [proposta()] })[0]
    expect(comProposta.valorCard).toBe(118_000)
    expect(comProposta.proposta?.reducaoPercentual).toBe(65.3)

    const pago = montar({
      propostas: [proposta()],
      pagamentos: [pagamento({ valor_pago: 115_000 })],
    })[0]
    expect(pago.valorCard).toBe(115_000)
  })

  it('marca urgente a proposta vencendo em até 2 dias', () => {
    const emDois = montar({ propostas: [proposta({ data_validade: '2026-07-17' })] })[0]
    expect(emDois.diasParaVencer).toBe(2)
    expect(emDois.urgente).toBe(true)

    const emCinco = montar({ propostas: [proposta({ data_validade: '2026-07-20' })] })[0]
    expect(emCinco.urgente).toBe(false)
  })

  it('contrato prestes a vencer não é urgente — urgência é de proposta em aberto', () => {
    const contrato = montar({
      propostas: [proposta({ data_validade: '2026-07-16', contrato_status: 'assinado' })],
    })[0]
    expect(contrato.etapa).toBe('contrato_nao_pago')
    expect(contrato.urgente).toBe(false)
  })

  it('cai para o lead quando o agendamento não tem identidade própria', () => {
    const card = montar({
      agendamentos: [
        agendamento({
          empresa: null,
          cpf_cnpj: null,
          valor_divida: null,
          lead: {
            nome_cliente: 'Anilson Pereira',
            empresa: 'TIO BOLAO LTDA',
            cpf_cnpj: '11222333000144',
            valor_divida: 90_000,
          },
        }),
      ],
    })[0]
    expect(card.empresa).toBe('TIO BOLAO LTDA')
    expect(card.cpfCnpj).toBe('11222333000144')
    expect(card.valorDivida).toBe(90_000)
  })

  it('sem empresa e sem lead, limpa o prefixo do título', () => {
    const card = montar({
      agendamentos: [agendamento({ empresa: null, lead: null, titulo: 'Reunião — MERCADINHO SP' })],
    })[0]
    expect(card.empresa).toBe('MERCADINHO SP')
  })
})

describe('montarCards — busca', () => {
  const dois = [agendamento(), agendamento({ id: 'ag2', empresa: 'AÇOUGUE CENTRAL', cpf_cnpj: '55444333000122' })]

  it('ignora acento e caixa', () => {
    expect(montar({ agendamentos: dois, busca: 'acougue' })).toHaveLength(1)
    expect(montar({ agendamentos: dois, busca: 'AÇOUGUE' })).toHaveLength(1)
  })

  it('acha por CNPJ pontuado', () => {
    const r = montar({ agendamentos: dois, busca: '12.345.678/0001-95' })
    expect(r).toHaveLength(1)
    expect(r[0].empresa).toBe('PADARIA DO ZE LTDA')
  })

  it('busca vazia não filtra', () => {
    expect(montar({ agendamentos: dois, busca: '   ' })).toHaveLength(2)
  })
})

describe('agruparEmBlocos', () => {
  it('distribui nos três blocos com contagem e soma', () => {
    const cards = montarCards({
      agendamentos: [
        agendamento(),
        agendamento({ id: 'ag2', status: 'realizado' }),
        agendamento({ id: 'ag3', status: 'realizado' }),
      ],
      propostas: [proposta({ id: 'p3', agendamento_id: 'ag3' })],
      pagamentos: [],
      janela: semana,
      agora: AGORA,
    })
    const [agenda, propostas, contratos] = agruparEmBlocos(cards)

    expect(agenda.quantidade).toBe(2)
    expect(agenda.total).toBe(680_000)
    expect(propostas.quantidade).toBe(1)
    expect(propostas.total).toBe(118_000)
    expect(contratos.quantidade).toBe(0)
    expect(contratos.total).toBe(0)
  })

  it('devolve as sete colunas mesmo vazias — o quadro não muda de forma', () => {
    const blocos = agruparEmBlocos([])
    expect(blocos.flatMap((b) => b.colunas)).toHaveLength(7)
    expect(blocos.map((b) => b.id)).toEqual(['agenda', 'propostas', 'contratos'])
  })
})
