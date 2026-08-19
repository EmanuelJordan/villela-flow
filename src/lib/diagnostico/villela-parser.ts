import { formatBRL, formatCpfCnpj } from '@/lib/utils'
import type { DiagnosticoExtraido, DiagnosticoParser, ResultadoExtracao } from './types'

// A página /diagnostico/<hash> é client-side: o HTML vem vazio e os dados chegam
// por estas duas rotas, que são públicas (sem cookie/token).
const ROTA_DIAGNOSTICO = 'diagnostic-light'
const ROTA_CADASTRO = 'basic-data-full'

const HOST = /(^|\.)relatorios\.suaempresa\.com\.br$/i
const CAMINHO = /^\/diagnostico\/([a-f0-9]{24})\/?$/i
const TIMEOUT_MS = 12_000

type Json = Record<string, unknown>

function obj(v: unknown): Json | undefined {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : undefined
}
function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}
function txt(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}
function lista(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

/** Extrai o id do relatório da URL colada; null se não for um link de diagnóstico da Villela. */
export function hashDoRelatorio(url: string): { hash: string; origem: string } | null {
  let u: URL
  try {
    u = new URL(url.trim())
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  if (!HOST.test(u.hostname)) return null
  const hash = CAMINHO.exec(u.pathname)?.[1]
  return hash ? { hash: hash.toLowerCase(), origem: u.origin } : null
}

async function buscarRota(origem: string, rota: string, hash: string): Promise<Response> {
  return fetch(`${origem}/api/franchisees/${rota}/${hash}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
}

/** "123.456.789-09 - FULANO DE TAL SILVA" → "FULANO DE TAL SILVA" */
function nomeDoSocio(entrada: unknown): string | undefined {
  const s = txt(entrada)
  return s ? txt(s.split(' - ').slice(1).join(' - ')) ?? s : undefined
}

function montar(diag: Json, cadastro: Json | undefined): DiagnosticoExtraido {
  const d = obj(diag.data) ?? {}
  const basico = obj(d.basicInfo) ?? {}
  const fiscal = obj(d.fiscalDebts) ?? {}
  const trabalhista = obj(d.laborDebts) ?? {}
  const bancaria = obj(d.bankingDebts) ?? {}
  const processos = obj(d.lawsuits) ?? {}
  const score = obj(d.score) ?? {}
  const recuperavel = obj(d.recoveredCapital) ?? {}

  const c = obj(cadastro?.data) ?? {}
  const socios = obj(c.companyPartners) ?? {}
  const endereco = txt(obj(c.address)?.address)

  const empresa = txt(basico.tradeName) ?? txt(basico.officialName)
  const cpfCnpj = txt(diag.document) ?? txt(cadastro?.document)
  const dividaFiscal = num(fiscal.fiscalDebtsValue) ?? 0
  const dividaTrabalhista = num(trabalhista.totalValue) ?? 0
  const dividaBancaria = num(bancaria.totalValue) ?? 0
  const total = dividaFiscal + dividaTrabalhista + dividaBancaria

  // o relatório é da empresa; quem senta na reunião normalmente é o primeiro sócio
  const primeiroSocio = nomeDoSocio(lista(socios.list)[0])
  const emitidoEm = txt(diag.createdAt)

  // Cada bloco vira uma linha só se tiver valor — evita "Dívida trabalhista: R$ 0,00"
  // ocupando espaço na descrição da reunião.
  const resumo = [
    empresa && `Empresa: ${empresa}`,
    cpfCnpj && `CNPJ/CPF: ${formatCpfCnpj(cpfCnpj)}`,
    primeiroSocio && `Sócio: ${primeiroSocio}`,
    dividaFiscal > 0 && `Dívida fiscal: ${formatBRL(dividaFiscal)}`,
    dividaTrabalhista > 0 && `Dívida trabalhista: ${formatBRL(dividaTrabalhista)}`,
    dividaBancaria > 0 && `Dívida bancária: ${formatBRL(dividaBancaria)}`,
    total > 0 && `Total: ${formatBRL(total)}`,
    num(score.score) != null && `Score: ${num(score.score)}`,
    num(processos.lawsuitsAmount) ? `Processos: ${num(processos.lawsuitsAmount)}` : false,
    emitidoEm && `Diagnóstico de ${new Date(emitidoEm).toLocaleDateString('pt-BR')}`,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    // sem o sócio, o nome da empresa é o melhor identificador disponível
    nomeCliente: primeiroSocio ?? empresa,
    empresa,
    cpfCnpj,
    // telefone/e-mail: o relatório não traz contato do cliente. O `contactLink` da
    // resposta é o WhatsApp do especialista da Villela — usá-lo aqui gravaria o
    // telefone da própria Villela como se fosse o do lead.
    valorDivida: total > 0 ? total : undefined,
    orgao: txt(basico.taxIdOrigin),
    // qtdInscricoes fica de fora: a API expõe processos judiciais, não inscrições
    // em dívida ativa — são coisas diferentes.
    resumo,
    detalhes: {
      dividaFiscal,
      dividaTrabalhista,
      dividaBancaria,
      capitalRecuperavel: num(recuperavel.total),
      score: num(score.score),
      processos: num(processos.lawsuitsAmount),
      situacaoCadastral: txt(basico.taxIdStatus),
      regimeTributario: txt(basico.taxRegime),
      endereco,
      socios: lista(socios.list).map(txt).filter(Boolean),
      emitidoEm,
      expirado: diag.isExpired === true,
    },
  }
}

export const villelaParser: DiagnosticoParser = {
  suporta: (url) => hashDoRelatorio(url) !== null,

  async extrair(url: string): Promise<ResultadoExtracao> {
    const alvo = hashDoRelatorio(url)
    if (!alvo) return { sucesso: false, erro: 'Link de diagnóstico inválido.', fonte: 'villela-v1' }

    let diagRes: Response
    let cadastroRes: Response | null
    try {
      ;[diagRes, cadastroRes] = await Promise.all([
        buscarRota(alvo.origem, ROTA_DIAGNOSTICO, alvo.hash),
        buscarRota(alvo.origem, ROTA_CADASTRO, alvo.hash).catch(() => null),
      ])
    } catch {
      return {
        sucesso: false,
        erro: 'Não foi possível acessar o relatório. Verifique a conexão e tente de novo.',
        fonte: 'villela-v1',
      }
    }

    if (diagRes.status === 404) {
      return { sucesso: false, erro: 'Relatório não encontrado — confira o link.', fonte: 'villela-v1' }
    }
    if (!diagRes.ok) {
      return { sucesso: false, erro: `O relatório respondeu com erro ${diagRes.status}.`, fonte: 'villela-v1' }
    }

    let diag: Json | undefined
    let cadastro: Json | undefined
    try {
      diag = obj(await diagRes.json())
      cadastro = cadastroRes?.ok ? obj(await cadastroRes.json()) : undefined
    } catch {
      return { sucesso: false, erro: 'O relatório devolveu uma resposta inesperada.', fonte: 'villela-v1' }
    }
    if (!diag) {
      return { sucesso: false, erro: 'O relatório devolveu uma resposta inesperada.', fonte: 'villela-v1' }
    }

    // o diagnóstico é processado em background; a página original fica repetindo
    // a chamada até virar FINISHED
    if (txt(diag.status) !== 'FINISHED') {
      return {
        sucesso: false,
        erro: 'O diagnóstico ainda está sendo processado. Tente de novo em alguns instantes.',
        fonte: 'villela-v1',
      }
    }

    return { sucesso: true, dados: montar(diag, cadastro), fonte: 'villela-v1' }
  },
}
