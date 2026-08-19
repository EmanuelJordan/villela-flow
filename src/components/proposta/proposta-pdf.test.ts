// @vitest-environment node
import { renderToBuffer } from '@react-pdf/renderer'
import { describe, expect, it } from 'vitest'
import type { ApresentacaoProposta } from '@/lib/validators/proposta-comercial'
import type { CondicoesComerciais } from './apresentacao-proposta'
import { PropostaPdfDoc } from './proposta-pdf'

// números do PDF de referência (SUPERMERCADO SUPER CESTA)
const apresentacao: ApresentacaoProposta = {
  versao: 2,
  especialista: { nome: 'João da Silva', email: 'joao@example.com', telefone: '21999990000' },
  cliente: {
    nomeCliente: 'Paulo',
    empresa: 'SUPERMERCADO SUPER CESTA LTDA',
    cpfCnpj: '37294753000167',
    telefoneEmpresa: '',
    telefoneWhatsapp: '11999990000',
  },
  diagnostico: {
    dividaFiscal: 619_699.86,
    dividaBancaria: 0,
    dividaTrabalhista: 204_413.7,
    capitalRecuperavel: 336_914.78,
    score: 131,
  },
  pgfn: {},
  simulacao: { dividaOriginal: 623_916.25, reducaoPct: 54, reducao: 336_914.78, consolidado: 287_001.47 },
  previsao: { aumento6m: 93_587.44, divida6m: 717_503.69, aumento12m: 199_653.2, divida12m: 823_569.45 },
}

const condicoes: CondicoesComerciais = {
  tituloEstrategia: 'Disponibilização de Garantia Real',
  descricaoEstrategia: 'Garantia real no processo.',
  valorEstrategia: 9_500,
  qtdParcelas: 6,
  valorParcela: 1_583.33,
  dataValidade: '2026-08-15',
  geradaEm: '2026-07-28T12:00:00-03:00',
}

const ehPdf = (buf: Buffer) => buf.length > 1000 && buf.subarray(0, 5).toString() === '%PDF-'

describe('PropostaPdfDoc', () => {
  it('renderiza a proposta completa (5 páginas) sem estourar', async () => {
    const buf = await renderToBuffer(
      PropostaPdfDoc({ apresentacao, condicoes, url: 'https://sistema/proposta/prop_abc123' }),
    )
    expect(ehPdf(buf)).toBe(true)
  })

  it('degrada com snapshot antigo (v1, sem previsão/especialista) — só some a página 2', async () => {
    const v1: ApresentacaoProposta = {
      versao: 1,
      cliente: { empresa: 'ACME LTDA' },
      diagnostico: {},
      pgfn: {},
      simulacao: {},
      previsao: {},
      especialista: {},
    }
    const buf = await renderToBuffer(
      PropostaPdfDoc({ apresentacao: v1, condicoes: { valorEstrategia: 5_000 } }),
    )
    expect(ehPdf(buf)).toBe(true)
  })

  it('não explode com apresentação nula', async () => {
    const buf = await renderToBuffer(PropostaPdfDoc({ apresentacao: null, condicoes: {} }))
    expect(ehPdf(buf)).toBe(true)
  })
})
