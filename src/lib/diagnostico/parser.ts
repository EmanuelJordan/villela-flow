import { stubParser } from './stub-parser'
import type { DiagnosticoParser, ResultadoExtracao } from './types'
import { villelaParser } from './villela-parser'

// Ordem importa: o primeiro parser que suportar a URL é usado. O villelaParser só
// aceita links reais de diagnóstico; qualquer outra URL cai no stub, que mantém a
// demo funcionando sem depender da API externa.
const PARSERS: DiagnosticoParser[] = [villelaParser, stubParser]

export async function extrairDiagnostico(url: string): Promise<ResultadoExtracao> {
  const parser = PARSERS.find((p) => p.suporta(url))
  if (!parser) return { sucesso: false, erro: 'Nenhum parser disponível para esta URL.', fonte: 'stub' }
  return parser.extrair(url)
}
