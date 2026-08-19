import { afterEach, describe, expect, it, vi } from 'vitest'
import { hashDoRelatorio, villelaParser } from './villela-parser'

const URL_OK = 'https://www.relatorios.suaempresa.com.br/diagnostico/0123456789abcdef01234567'

// Recortes fiéis das respostas reais da API (só os campos que o parser lê).
const DIAGNOSTICO = {
  status: 'FINISHED',
  document: '12345678000195',
  createdAt: '2026-07-14T14:21:05.717Z',
  isExpired: true,
  data: {
    basicInfo: {
      officialName: 'EMPRESA EXEMPLO LTDA',
      tradeName: '',
      taxIdOrigin: 'Receita Federal',
      taxIdStatus: 'ATIVA',
      taxRegime: 'LTDA',
    },
    fiscalDebts: { fiscalDebtsValue: 52686.11 },
    laborDebts: { totalValue: 150916.09 },
    bankingDebts: { totalValue: 0 },
    lawsuits: { lawsuitsAmount: 9 },
    score: { score: 530 },
    recoveredCapital: { total: 18966.9996 },
  },
}

const CADASTRO = {
  status: 'FINISHED',
  data: {
    address: { address: 'AV EXEMPLO, 100 - CENTRO, CIDADE EXEMPLO - SP, BRASIL - 01000000' },
    companyPartners: {
      list: [
        '123.456.789-09 - FULANO DE TAL SILVA',
        '987.654.321-00 - CICLANA DE TAL SOUZA',
      ],
      total: 2,
    },
  },
}

const resposta = (corpo: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => corpo }) as Response

/** Responde conforme a rota chamada, para o teste não depender da ordem do Promise.all. */
function mockFetch(diag: Response, cadastro: Response = resposta(CADASTRO)) {
  const fn = vi.fn(async (url: string) =>
    String(url).includes('diagnostic-light') ? diag : cadastro,
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

describe('hashDoRelatorio', () => {
  it('aceita o link de diagnóstico com e sem www', () => {
    expect(hashDoRelatorio(URL_OK)?.hash).toBe('0123456789abcdef01234567')
    expect(
      hashDoRelatorio('https://relatorios.suaempresa.com.br/diagnostico/0123456789abcdef01234567')?.hash,
    ).toBe('0123456789abcdef01234567')
  })

  it('recusa outro domínio, outra rota e hash malformado', () => {
    expect(hashDoRelatorio('https://exemplo.com/diagnostico/0123456789abcdef01234567')).toBeNull()
    expect(hashDoRelatorio('https://www.relatorios.suaempresa.com.br/planos')).toBeNull()
    expect(hashDoRelatorio('https://www.relatorios.suaempresa.com.br/diagnostico/abc')).toBeNull()
  })

  it('não confunde domínio que apenas termina parecido', () => {
    expect(
      hashDoRelatorio('https://relatorios.suaempresa.com.br.golpe.net/diagnostico/0123456789abcdef01234567'),
    ).toBeNull()
  })

  it('recusa texto que não é URL', () => {
    expect(hashDoRelatorio('nao sou um link')).toBeNull()
  })
})

describe('villelaParser.suporta', () => {
  it('assume só os links da Villela, deixando o resto para o stub', () => {
    expect(villelaParser.suporta(URL_OK)).toBe(true)
    expect(villelaParser.suporta('https://diagnostico.suaempresa.com.br/r/carlos1')).toBe(false)
  })
})

describe('villelaParser.extrair', () => {
  it('mapeia os campos do relatório real', async () => {
    mockFetch(resposta(DIAGNOSTICO))
    const r = await villelaParser.extrair(URL_OK)

    expect(r.sucesso).toBe(true)
    expect(r.fonte).toBe('villela-v1')
    expect(r.dados?.empresa).toBe('EMPRESA EXEMPLO LTDA')
    expect(r.dados?.cpfCnpj).toBe('12345678000195')
    expect(r.dados?.orgao).toBe('Receita Federal')
    // o sócio é quem senta na reunião, não a razão social
    expect(r.dados?.nomeCliente).toBe('FULANO DE TAL SILVA')
  })

  it('soma as três frentes de dívida', async () => {
    mockFetch(resposta(DIAGNOSTICO))
    const r = await villelaParser.extrair(URL_OK)
    expect(r.dados?.valorDivida).toBeCloseTo(52686.11 + 150916.09, 2)
  })

  it('nunca grava o contato da Villela como telefone do cliente', async () => {
    mockFetch(resposta({ ...DIAGNOSTICO, contactLink: 'https://wa.me/5521985755006' }))
    const r = await villelaParser.extrair(URL_OK)
    expect(r.dados?.telefone).toBeUndefined()
    expect(r.dados?.email).toBeUndefined()
  })

  it('omite do resumo as dívidas zeradas', async () => {
    mockFetch(resposta(DIAGNOSTICO))
    const r = await villelaParser.extrair(URL_OK)
    expect(r.dados?.resumo).toContain('Dívida fiscal')
    expect(r.dados?.resumo).not.toContain('bancária')
  })

  it('funciona mesmo se o cadastro complementar falhar', async () => {
    mockFetch(resposta(DIAGNOSTICO), resposta(null, 500))
    const r = await villelaParser.extrair(URL_OK)
    expect(r.sucesso).toBe(true)
    // sem a lista de sócios, cai na razão social
    expect(r.dados?.nomeCliente).toBe('EMPRESA EXEMPLO LTDA')
  })

  it('avisa quando o diagnóstico ainda está processando', async () => {
    mockFetch(resposta({ ...DIAGNOSTICO, status: 'PROCESSING' }))
    const r = await villelaParser.extrair(URL_OK)
    expect(r.sucesso).toBe(false)
    expect(r.erro).toMatch(/processado/i)
  })

  it('diferencia relatório inexistente de erro do servidor', async () => {
    mockFetch(resposta(null, 404))
    expect((await villelaParser.extrair(URL_OK)).erro).toMatch(/não encontrado/i)

    mockFetch(resposta(null, 500))
    expect((await villelaParser.extrair(URL_OK)).erro).toMatch(/500/)
  })

  it('não estoura quando a rede cai', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET') }))
    const r = await villelaParser.extrair(URL_OK)
    expect(r.sucesso).toBe(false)
    expect(r.erro).toMatch(/conexão/i)
  })
})
