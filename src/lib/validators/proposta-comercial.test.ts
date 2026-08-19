import { describe, expect, it } from 'vitest'
import { apresentacaoSchema, propostaComercialSchema } from './proposta-comercial'

const entradaValida = {
  agendamento_id: '6f9619ff-8b86-4d01-b42d-00cf4fc964ff',
  cliente: {
    nomeCliente: 'Warlei',
    empresa: 'LOCTR',
    cpfCnpj: '25310222000131',
    dataReuniao: '2026-05-08T14:00:00-03:00',
    franqueado: 'Felipe',
    whatsappCloser: '',
    telefoneEmpresa: '',
    telefoneWhatsapp: '11999990000',
  },
  diagnostico: {
    score: '131',
    capitalRecuperavel: '122407.46',
    dividaFiscal: '230957.47',
    dividaBancaria: '',
    dividaTrabalhista: '1179706.65',
  },
  pgfn: { valorDivida: '230957.47', observacao: '' },
  valorTotalDivida: '230957.47',
  reducaoPct: '53',
  precificacao: {
    tituloEstrategia: 'Garantia real',
    valorEstrategia: '12000',
    descricaoEstrategia: 'Disponibilização de garantia real no processo.',
    qtdParcelas: '6',
    valorEntrada: '',
    validadeDias: 5,
  },
}

describe('propostaComercialSchema', () => {
  it('aceita o formulário completo e converte números', () => {
    const r = propostaComercialSchema.safeParse(entradaValida)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.valorTotalDivida).toBe(230_957.47)
    expect(r.data.precificacao.qtdParcelas).toBe(6)
    expect(r.data.precificacao.valorEntrada).toBeUndefined()
    expect(r.data.diagnostico.dividaBancaria).toBeUndefined()
  })

  it("números opcionais vazios viram undefined, nunca 0", () => {
    const r = propostaComercialSchema.safeParse(entradaValida)
    if (!r.success) throw new Error('deveria passar')
    expect(r.data.pgfn.observacao === '' || r.data.pgfn.observacao === undefined).toBe(true)
    expect(r.data.diagnostico.dividaBancaria).not.toBe(0)
  })

  it('rejeita estratégia acima da dívida', () => {
    const r = propostaComercialSchema.safeParse({
      ...entradaValida,
      precificacao: { ...entradaValida.precificacao, valorEstrategia: '999999999' },
    })
    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.issues[0].message).toMatch(/não pode custar mais/)
  })

  it('rejeita entrada maior ou igual à estratégia', () => {
    const r = propostaComercialSchema.safeParse({
      ...entradaValida,
      precificacao: { ...entradaValida.precificacao, valorEntrada: '12000' },
    })
    expect(r.success).toBe(false)
  })

  it('rejeita validade fora de 1/3/5/10 dias', () => {
    const r = propostaComercialSchema.safeParse({
      ...entradaValida,
      precificacao: { ...entradaValida.precificacao, validadeDias: 7 },
    })
    expect(r.success).toBe(false)
  })

  it('exige título e dívida total', () => {
    expect(
      propostaComercialSchema.safeParse({
        ...entradaValida,
        precificacao: { ...entradaValida.precificacao, tituloEstrategia: 'ab' },
      }).success,
    ).toBe(false)
    expect(propostaComercialSchema.safeParse({ ...entradaValida, valorTotalDivida: '' }).success).toBe(
      false,
    )
  })
})

describe('apresentacaoSchema', () => {
  it('aceita snapshot completo', () => {
    const r = apresentacaoSchema.safeParse({
      versao: 1,
      cliente: { empresa: 'LOCTR' },
      diagnostico: { capitalRecuperavel: 122_407.46 },
      pgfn: {},
      simulacao: { dividaOriginal: 230_957.47, reducaoPct: 53, reducao: 122_407.46, consolidado: 108_550.01 },
    })
    expect(r.success).toBe(true)
  })

  it('blocos ausentes degradam para objetos vazios', () => {
    const r = apresentacaoSchema.safeParse({ versao: 1 })
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.cliente).toEqual({})
    expect(r.data.simulacao).toEqual({})
  })

  it('jsonb estranho falha com segurança (a página degrada, não explode)', () => {
    expect(apresentacaoSchema.safeParse(null).success).toBe(false)
    expect(apresentacaoSchema.safeParse({ versao: 3 }).success).toBe(false)
    expect(apresentacaoSchema.safeParse('texto').success).toBe(false)
  })

  it('dataReuniao é string livre — quem renderiza precisa tratar data inválida', () => {
    // documenta o contrato: o schema aceita, então a apresentação guarda com
    // isValid antes de formatar (senão a página pública devolveria 500)
    const r = apresentacaoSchema.safeParse({ versao: 1, cliente: { dataReuniao: 'amanhã' } })
    expect(r.success).toBe(true)
    expect(Number.isNaN(new Date('amanhã').getTime())).toBe(true)
  })
})
