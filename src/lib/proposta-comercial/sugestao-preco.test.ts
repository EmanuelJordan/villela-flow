import { describe, expect, it } from 'vitest'
import { sugerirPreco, VALOR_MINIMO } from './sugestao-preco'

describe('sugerirPreco', () => {
  it('usa 10% do capital recuperável quando ele existe', () => {
    expect(sugerirPreco(122_407.46, 230_957.47)).toEqual({
      valor: 12_200,
      base: 'capital_recuperavel',
      percentual: 0.1,
    })
  })

  it('cai para 5% da dívida total sem capital recuperável', () => {
    expect(sugerirPreco(null, 400_000)).toEqual({
      valor: 20_000,
      base: 'divida_total',
      percentual: 0.05,
    })
  })

  it('capital zerado não é base — vale a dívida', () => {
    expect(sugerirPreco(0, 200_000)?.base).toBe('divida_total')
  })

  it('aplica o piso comercial em valores pequenos', () => {
    expect(sugerirPreco(10_000, null)?.valor).toBe(VALOR_MINIMO)
    expect(sugerirPreco(null, 30_000)?.valor).toBe(VALOR_MINIMO)
  })

  it('arredonda ao múltiplo de R$ 100 mais próximo', () => {
    // 10% de 123.456 = 12.345,60 → 12.300
    expect(sugerirPreco(123_456, null)?.valor).toBe(12_300)
    // 10% de 125.500 = 12.550 → 12.600 (metade sobe)
    expect(sugerirPreco(125_500, null)?.valor).toBe(12_600)
  })

  it('sem base nenhuma devolve null', () => {
    expect(sugerirPreco(null, null)).toBeNull()
    expect(sugerirPreco(undefined, undefined)).toBeNull()
    expect(sugerirPreco(0, 0)).toBeNull()
    expect(sugerirPreco(NaN, NaN)).toBeNull()
  })
})
