/** Sugestão de preço do contrato — o "Vitória IA" da referência, aqui como
 *  regra determinística: barata, instantânea e auditável. O franqueado sempre
 *  pode ignorar e digitar o próprio valor. */

export const PERCENTUAL_CAPITAL = 0.1
export const PERCENTUAL_DIVIDA = 0.05
export const VALOR_MINIMO = 5_000
export const ARREDONDAR_PARA = 100

export interface SugestaoPreco {
  valor: number
  base: 'capital_recuperavel' | 'divida_total'
  percentual: number
}

/**
 * 10% do capital recuperável; sem capital, 5% da dívida total. Piso de
 * R$ 5.000 e arredondamento ao múltiplo de R$ 100 mais próximo. Sem base de
 * cálculo nenhuma, devolve null — aí não há o que sugerir.
 */
export function sugerirPreco(
  capitalRecuperavel: number | null | undefined,
  valorTotalDivida: number | null | undefined,
): SugestaoPreco | null {
  const capital =
    capitalRecuperavel != null && Number.isFinite(capitalRecuperavel) && capitalRecuperavel > 0
      ? capitalRecuperavel
      : null
  const divida =
    valorTotalDivida != null && Number.isFinite(valorTotalDivida) && valorTotalDivida > 0
      ? valorTotalDivida
      : null

  if (capital == null && divida == null) return null

  const base = capital != null ? ('capital_recuperavel' as const) : ('divida_total' as const)
  const percentual = base === 'capital_recuperavel' ? PERCENTUAL_CAPITAL : PERCENTUAL_DIVIDA
  const bruto = (capital ?? divida!) * percentual
  const arredondado = Math.round(bruto / ARREDONDAR_PARA) * ARREDONDAR_PARA

  return { valor: Math.max(VALOR_MINIMO, arredondado), base, percentual }
}
