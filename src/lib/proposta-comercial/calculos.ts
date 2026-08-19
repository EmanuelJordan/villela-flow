import { tz } from '@date-fns/tz'
import { addDays, format } from 'date-fns'

/** Datas comerciais no fuso da equipe, não no do servidor (UTC em produção). */
const SP = tz('America/Sao_Paulo')

export const VALIDADES_DIAS = [1, 3, 5, 10] as const

const centavos = (v: number) => Math.round(v * 100) / 100

/** Parcela = (total − entrada) / parcelas, em centavos. Entrada engolindo o
 *  total (ou parcelas inválidas) devolve 0 — o formulário mostra e o validator
 *  barra antes de gravar. */
export function calcularParcela(valorTotal: number, qtdParcelas: number, valorEntrada = 0): number {
  if (!Number.isFinite(valorTotal) || !Number.isFinite(qtdParcelas) || qtdParcelas < 1) return 0
  const entrada = Number.isFinite(valorEntrada) ? valorEntrada : 0
  const restante = valorTotal - entrada
  if (restante <= 0) return 0
  return centavos(restante / Math.floor(qtdParcelas))
}

/** Emissão + dias corridos → 'yyyy-MM-dd' no fuso de São Paulo. Formatar em UTC
 *  viraria o dia 3h mais cedo e a proposta "venceria" antes da hora. */
export function calcularValidade(dias: number, emissao: Date = new Date()): string {
  return format(addDays(emissao, dias), 'yyyy-MM-dd', { in: SP })
}

/** Redução prevista aplicada à dívida: quanto sai e quanto sobra (consolidado). */
export function simularReducao(
  dividaOriginal: number,
  reducaoPct: number,
): { reducao: number; consolidado: number } {
  if (!Number.isFinite(dividaOriginal) || dividaOriginal <= 0) return { reducao: 0, consolidado: 0 }
  const pct = Number.isFinite(reducaoPct) ? Math.min(100, Math.max(0, reducaoPct)) : 0
  const reducao = centavos(dividaOriginal * (pct / 100))
  return { reducao, consolidado: centavos(dividaOriginal - reducao) }
}

/** Vencida só depois que o dia da validade termina em São Paulo — comparar
 *  strings 'yyyy-MM-dd' evita o clássico date-only virando meia-noite UTC. */
export function propostaExpirada(
  dataValidade: string | null | undefined,
  agora: Date = new Date(),
): boolean {
  if (!dataValidade) return false
  return dataValidade < format(agora, 'yyyy-MM-dd', { in: SP })
}

/** Crescimento estimado da dívida sem ação, sobre a dívida atual. Taxas fixas
 *  calibradas pelo material da Villela (6m = +15%, 12m = +32% da dívida total);
 *  ajustáveis aqui num ponto só. */
export const CRESCIMENTO_6M = 0.15
export const CRESCIMENTO_12M = 0.32

/** Projeção "se nada for feito": aumento estimado e dívida projetada em 6 e 12
 *  meses. `null` sem dívida — a seção some no PDF em vez de mostrar zeros. */
export function projetarDivida(
  dividaTotal: number,
): { aumento6m: number; divida6m: number; aumento12m: number; divida12m: number } | null {
  if (!Number.isFinite(dividaTotal) || dividaTotal <= 0) return null
  const aumento6m = centavos(dividaTotal * CRESCIMENTO_6M)
  const aumento12m = centavos(dividaTotal * CRESCIMENTO_12M)
  return {
    aumento6m,
    divida6m: centavos(dividaTotal + aumento6m),
    aumento12m,
    divida12m: centavos(dividaTotal + aumento12m),
  }
}

/** Termos do parcelamento bancário convencional usados só como contraste no
 *  comparativo (entrada obrigatória de 20% + 60x sobre o restante). */
export const ENTRADA_CONVENCIONAL_PCT = 0.2
export const PARCELAS_CONVENCIONAL = 60
/** Teto de parcelamento da dívida consolidada na estratégia Villela. */
export const PARCELAS_DIVIDA_ESTRATEGIA = 145

export interface ComparativoSolucoes {
  convencional: { entrada: number; parcela: number; parcelas: number }
  estrategia: { entrada: number; parcela: number; parcelas: number; consolidado: number }
  economiaMensal: number
  economiaAnual: number
  /** Quanto a parcela da estratégia é menor que a convencional, em % (ex.: 76). */
  parcelaMenorPct: number
  /** Valor recuperado = redução da dívida (o que o cliente deixa de pagar). */
  reducaoValor: number
  /** Parcela do investimento na estratégia (o honorário), não da dívida. */
  investimentoParcela: number
  /** Retorno sobre o investimento: recuperado ÷ honorário (ex.: 35 → "35x"). */
  roi: number
  /** Honorário como % do recuperado (ex.: 2.8). */
  percentualRecuperado: number
}

/** Números da página de comparativo/investimento do PDF. Tudo derivado da dívida,
 *  da redução prevista e do preço da estratégia — sem novos campos no formulário.
 *  `null` sem dívida. */
export function compararSolucoes(params: {
  dividaTotal: number
  reducaoPct: number
  valorEstrategia: number
  qtdParcelas: number
  valorEntrada?: number
}): ComparativoSolucoes | null {
  const { dividaTotal, reducaoPct, valorEstrategia, qtdParcelas, valorEntrada = 0 } = params
  if (!Number.isFinite(dividaTotal) || dividaTotal <= 0) return null

  const entradaConv = centavos(dividaTotal * ENTRADA_CONVENCIONAL_PCT)
  const parcelaConv = calcularParcela(dividaTotal, PARCELAS_CONVENCIONAL, entradaConv)

  const { reducao, consolidado } = simularReducao(dividaTotal, reducaoPct)
  const parcelaEstrat = calcularParcela(consolidado, PARCELAS_DIVIDA_ESTRATEGIA)

  const economiaMensal = centavos(Math.max(0, parcelaConv - parcelaEstrat))
  const parcelaMenorPct = parcelaConv > 0 ? Math.round((1 - parcelaEstrat / parcelaConv) * 100) : 0

  const investimentoParcela = calcularParcela(valorEstrategia, qtdParcelas, valorEntrada)
  const roi = valorEstrategia > 0 ? reducao / valorEstrategia : 0
  const percentualRecuperado = reducao > 0 ? (valorEstrategia / reducao) * 100 : 0

  return {
    convencional: { entrada: entradaConv, parcela: parcelaConv, parcelas: PARCELAS_CONVENCIONAL },
    estrategia: { entrada: 0, parcela: parcelaEstrat, parcelas: PARCELAS_DIVIDA_ESTRATEGIA, consolidado },
    economiaMensal,
    economiaAnual: centavos(economiaMensal * 12),
    parcelaMenorPct,
    reducaoValor: reducao,
    investimentoParcela,
    roi,
    percentualRecuperado,
  }
}
