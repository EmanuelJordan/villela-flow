import { describe, expect, it } from 'vitest'
import {
  montarPrefill,
  reidratarForm,
  REDUCAO_PADRAO_PCT,
  type EntradaPrefill,
  type PropostaExistenteRow,
} from './prefill'

const agendamentoBase: EntradaPrefill['agendamento'] = {
  titulo: 'Reunião — LOCTR',
  inicio: '2026-05-08T14:00:00-03:00',
  empresa: 'LOCTR TECNOLOGIA',
  cpf_cnpj: '25310222000131',
  valor_divida: 230_957.47,
  diagnostico_dados: {
    nomeCliente: 'WARLEI',
    empresa: 'LOCTR TECNOLOGIA DE RESIDUOS LTDA.',
    cpfCnpj: '25310222000131',
    valorDivida: 230_957.47,
    detalhes: {
      dividaFiscal: 230_957.47,
      dividaTrabalhista: 1_179_706.65,
      dividaBancaria: 0,
      capitalRecuperavel: 122_407.46,
      score: 131,
    },
  },
}

const leadBase: NonNullable<EntradaPrefill['lead']> = {
  nome_cliente: 'Warlei do Lead',
  empresa: 'LOCTR (lead)',
  cpf_cnpj: '99999999000199',
  telefone: '11999990000',
  valor_divida: 111_111,
  diagnostico_dados: null,
}

describe('montarPrefill', () => {
  it('agendamento manda na identidade; lead completa nome e telefone', () => {
    const form = montarPrefill({ agendamento: agendamentoBase, lead: leadBase, nomeFranqueado: 'Felipe' })
    expect(form.cliente.empresa).toBe('LOCTR TECNOLOGIA')
    expect(form.cliente.cpfCnpj).toBe('25310222000131')
    expect(form.valorTotalDivida).toBe('230957.47')
    expect(form.cliente.nomeCliente).toBe('Warlei do Lead')
    expect(form.cliente.telefoneWhatsapp).toBe('11999990000')
    expect(form.cliente.franqueado).toBe('Felipe')
    expect(form.cliente.dataReuniao).toBe('2026-05-08T14:00:00-03:00')
  })

  it('sem lead, o diagnóstico preenche o que o agendamento não tem', () => {
    const ag = { ...agendamentoBase, empresa: null, cpf_cnpj: null, valor_divida: null }
    const form = montarPrefill({ agendamento: ag, lead: null, nomeFranqueado: 'Felipe' })
    expect(form.cliente.nomeCliente).toBe('WARLEI')
    expect(form.cliente.empresa).toBe('LOCTR TECNOLOGIA DE RESIDUOS LTDA.')
    expect(form.valorTotalDivida).toBe('230957.47')
  })

  it('extrai o bloco financeiro dos detalhes e deriva a redução prevista', () => {
    const form = montarPrefill({ agendamento: agendamentoBase, lead: null, nomeFranqueado: 'F' })
    expect(form.diagnostico.capitalRecuperavel).toBe('122407.46')
    expect(form.diagnostico.score).toBe('131')
    expect(form.diagnostico.dividaTrabalhista).toBe('1179706.65')
    expect(form.pgfn.valorDivida).toBe('230957.47')
    // 122.407,46 / 230.957,47 ≈ 53%
    expect(form.reducaoPct).toBe('53')
  })

  it('pré-calcula a previsão de aumento da dívida (+15% em 6m, +32% em 12m)', () => {
    const form = montarPrefill({ agendamento: agendamentoBase, lead: null, nomeFranqueado: 'F' })
    // 230.957,47 × 1,15 e × 1,32
    expect(form.previsao.divida6m).toBe('265601.09')
    expect(form.previsao.divida12m).toBe('304863.86')
  })

  it('diagnóstico do agendamento vence o do lead', () => {
    const lead = {
      ...leadBase,
      diagnostico_dados: { detalhes: { capitalRecuperavel: 1 } },
    }
    const form = montarPrefill({ agendamento: agendamentoBase, lead, nomeFranqueado: 'F' })
    expect(form.diagnostico.capitalRecuperavel).toBe('122407.46')
  })

  it('diagnóstico malformado não explode — campos ficam vazios', () => {
    const ag = {
      ...agendamentoBase,
      empresa: null,
      cpf_cnpj: null,
      valor_divida: null,
      diagnostico_dados: ['array', 'errado'],
    }
    const form = montarPrefill({ agendamento: ag, lead: null, nomeFranqueado: 'F' })
    expect(form.cliente.nomeCliente).toBe('')
    expect(form.diagnostico.capitalRecuperavel).toBe('')
    expect(form.valorTotalDivida).toBe('')
    expect(form.reducaoPct).toBe(String(REDUCAO_PADRAO_PCT))
  })

  it('valores estranhos nos detalhes viram vazio, não NaN', () => {
    const ag = {
      ...agendamentoBase,
      diagnostico_dados: { detalhes: { capitalRecuperavel: 'muito', score: null } },
    }
    const form = montarPrefill({ agendamento: ag, lead: null, nomeFranqueado: 'F' })
    expect(form.diagnostico.capitalRecuperavel).toBe('')
    expect(form.diagnostico.score).toBe('')
  })
})

describe('reidratarForm', () => {
  const base = montarPrefill({ agendamento: agendamentoBase, lead: leadBase, nomeFranqueado: 'Felipe' })

  const propostaRica: PropostaExistenteRow = {
    valor_total_divida: 200_000,
    valor_estrategia: 12_000,
    titulo_estrategia: 'Garantia real',
    descricao_estrategia: 'Descrição salva.',
    qtd_parcelas: 4,
    valor_entrada: 2_000,
    capital_recuperavel: 99_999,
    apresentacao: {
      versao: 1,
      cliente: { nomeCliente: 'Warlei do Snapshot', whatsappCloser: '21999990000' },
      diagnostico: { score: 500 },
      pgfn: { valorDivida: 123 },
      simulacao: { dividaOriginal: 200_000, reducaoPct: 40, reducao: 80_000, consolidado: 120_000 },
    },
  }

  it('snapshot e colunas vencem o prefill', () => {
    const form = reidratarForm(base, propostaRica)
    expect(form.cliente.nomeCliente).toBe('Warlei do Snapshot')
    expect(form.cliente.whatsappCloser).toBe('21999990000')
    expect(form.diagnostico.score).toBe('500')
    expect(form.diagnostico.capitalRecuperavel).toBe('99999')
    expect(form.valorTotalDivida).toBe('200000')
    expect(form.reducaoPct).toBe('40')
    expect(form.precificacao.tituloEstrategia).toBe('Garantia real')
    expect(form.precificacao.qtdParcelas).toBe('4')
    expect(form.precificacao.temEntrada).toBe(true)
    expect(form.precificacao.valorEntrada).toBe('2000')
  })

  it('o que o snapshot não tem continua vindo do prefill', () => {
    const form = reidratarForm(base, propostaRica)
    expect(form.cliente.empresa).toBe(base.cliente.empresa)
    expect(form.diagnostico.dividaTrabalhista).toBe(base.diagnostico.dividaTrabalhista)
  })

  it('proposta do dialog rápido (sem snapshot) reidrata só os valores', () => {
    const doDialog: PropostaExistenteRow = {
      valor_total_divida: 150_000,
      valor_estrategia: 9_000,
      titulo_estrategia: null,
      descricao_estrategia: null,
      qtd_parcelas: 1,
      valor_entrada: null,
      capital_recuperavel: null,
      apresentacao: null,
    }
    const form = reidratarForm(base, doDialog)
    expect(form.valorTotalDivida).toBe('150000')
    expect(form.precificacao.valorEstrategia).toBe('9000')
    expect(form.precificacao.tituloEstrategia).toBe('')
    expect(form.precificacao.temEntrada).toBe(false)
    expect(form.cliente.nomeCliente).toBe(base.cliente.nomeCliente)
    expect(form.diagnostico.capitalRecuperavel).toBe(base.diagnostico.capitalRecuperavel)
  })
})
