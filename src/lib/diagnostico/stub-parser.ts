import { createHash } from 'node:crypto'
import type { DiagnosticoParser, ResultadoExtracao } from './types'

const NOMES = [
  'Carlos Andrade', 'Fernanda Ribeiro', 'João Pedro Sales', 'Mariana Costa',
  'Ricardo Tavares', 'Ana Paula Duarte', 'Bruno Cardoso', 'Juliana Freitas',
]
const EMPRESAS = [
  'Transportadora Horizonte Ltda', 'Metalúrgica São Jorge ME', 'Distribuidora Alvorada SA',
  'Construtora Pilar Ltda', 'Agropecuária Boa Vista', 'Confecções Estilo Sul EPP',
  'Padaria e Confeitaria Doce Trigo', 'TecPeças Autopeças Ltda',
]
const ORGAOS = ['PGFN', 'Receita Federal', 'PGFN — Dívida Ativa da União']

function h(url: string, salt: string): number {
  return createHash('md5').update(`${salt}:${url}`).digest().readUInt32BE(0)
}

function digitos(url: string, salt: string, qtd: number): string {
  let out = ''
  let i = 0
  while (out.length < qtd) {
    out += String(h(url, `${salt}:${i++}`))
    out = out.slice(0, qtd)
  }
  return out
}

export const stubParser: DiagnosticoParser = {
  suporta: () => true,

  async extrair(url: string): Promise<ResultadoExtracao> {
    const delay = Number(process.env.STUB_DELAY_MS ?? 800)
    if (delay > 0) await new Promise((r) => setTimeout(r, delay))

    if (!/^https?:\/\/\S+$/i.test(url)) {
      return { sucesso: false, erro: 'URL do relatório inválida.', fonte: 'stub' }
    }

    const valorDivida = 15_000 + (h(url, 'valor') % 1_985_001)
    return {
      sucesso: true,
      fonte: 'stub',
      dados: {
        nomeCliente: NOMES[h(url, 'nome') % NOMES.length],
        empresa: EMPRESAS[h(url, 'empresa') % EMPRESAS.length],
        cpfCnpj: digitos(url, 'cnpj', 14),
        telefone: `(${11 + (h(url, 'ddd') % 88)}) 9${digitos(url, 'tel', 8)}`,
        email: `contato@${EMPRESAS[h(url, 'empresa') % EMPRESAS.length].split(' ')[0].toLowerCase()}.com.br`,
        valorDivida,
        qtdInscricoes: 1 + (h(url, 'inscricoes') % 12),
        orgao: ORGAOS[h(url, 'orgao') % ORGAOS.length],
        detalhes: { simulado: true },
      },
    }
  },
}
