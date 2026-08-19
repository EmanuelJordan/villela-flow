import { describe, expect, it } from 'vitest'
import {
  calcularParcela,
  calcularValidade,
  compararSolucoes,
  projetarDivida,
  propostaExpirada,
  simularReducao,
} from './calculos'

describe('calcularParcela', () => {
  it('divide o total pelas parcelas em centavos', () => {
    expect(calcularParcela(12_000, 6)).toBe(2_000)
    expect(calcularParcela(10_000, 3)).toBe(3_333.33)
  })

  it('desconta a entrada antes de parcelar', () => {
    expect(calcularParcela(12_000, 5, 2_000)).toBe(2_000)
  })

  it('entrada engolindo o total (ou parcelas inválidas) devolve 0', () => {
    expect(calcularParcela(5_000, 6, 5_000)).toBe(0)
    expect(calcularParcela(5_000, 6, 7_000)).toBe(0)
    expect(calcularParcela(5_000, 0)).toBe(0)
    expect(calcularParcela(NaN, 6)).toBe(0)
  })
})

describe('calcularValidade', () => {
  it('soma dias corridos à emissão', () => {
    const emissao = new Date('2026-07-22T10:00:00-03:00')
    expect(calcularValidade(5, emissao)).toBe('2026-07-27')
    expect(calcularValidade(1, emissao)).toBe('2026-07-23')
  })

  it('formata no fuso de São Paulo, não em UTC', () => {
    // 23h30 em SP já é dia seguinte em UTC — a validade não pode pular um dia
    const noiteEmSp = new Date('2026-07-22T23:30:00-03:00')
    expect(calcularValidade(1, noiteEmSp)).toBe('2026-07-23')
  })
})

describe('simularReducao', () => {
  it('reproduz a simulação da referência (53% de redução)', () => {
    expect(simularReducao(230_957.47, 53)).toEqual({ reducao: 122_407.46, consolidado: 108_550.01 })
  })

  it('0% e 100% são os extremos', () => {
    expect(simularReducao(100_000, 0)).toEqual({ reducao: 0, consolidado: 100_000 })
    expect(simularReducao(100_000, 100)).toEqual({ reducao: 100_000, consolidado: 0 })
  })

  it('percentual fora da faixa é grampeado', () => {
    expect(simularReducao(100_000, 150)).toEqual({ reducao: 100_000, consolidado: 0 })
    expect(simularReducao(100_000, -10)).toEqual({ reducao: 0, consolidado: 100_000 })
  })

  it('dívida inválida zera a simulação', () => {
    expect(simularReducao(0, 50)).toEqual({ reducao: 0, consolidado: 0 })
    expect(simularReducao(NaN, 50)).toEqual({ reducao: 0, consolidado: 0 })
  })
})

describe('propostaExpirada', () => {
  const AGORA = new Date('2026-07-23T10:00:00-03:00')

  it('vencida só depois que o dia da validade termina', () => {
    expect(propostaExpirada('2026-07-22', AGORA)).toBe(true)
    expect(propostaExpirada('2026-07-23', AGORA)).toBe(false)
    expect(propostaExpirada('2026-07-24', AGORA)).toBe(false)
  })

  it('usa o dia de São Paulo mesmo quando UTC já virou', () => {
    // 22h em SP = 1h UTC do dia seguinte; em SP ainda é dia 23
    const noite = new Date('2026-07-23T22:00:00-03:00')
    expect(propostaExpirada('2026-07-23', noite)).toBe(false)
  })

  it('sem validade não expira', () => {
    expect(propostaExpirada(null, AGORA)).toBe(false)
    expect(propostaExpirada(undefined, AGORA)).toBe(false)
  })
})

describe('projetarDivida', () => {
  it('reproduz a previsão da referência (+15% em 6m, +32% em 12m)', () => {
    expect(projetarDivida(623_916.25)).toEqual({
      aumento6m: 93_587.44,
      divida6m: 717_503.69,
      aumento12m: 199_653.2,
      divida12m: 823_569.45,
    })
  })

  it('sem dívida devolve null (a seção some)', () => {
    expect(projetarDivida(0)).toBeNull()
    expect(projetarDivida(NaN)).toBeNull()
  })
})

describe('compararSolucoes', () => {
  // números batidos com o PDF de referência: dívida 623.916,25, redução 54%,
  // honorário 9.500 em 6x
  const r = compararSolucoes({
    dividaTotal: 623_916.25,
    reducaoPct: 54,
    valorEstrategia: 9_500,
    qtdParcelas: 6,
  })!

  it('parcelamento convencional: 20% de entrada + 60x sobre o restante', () => {
    expect(r.convencional.entrada).toBe(124_783.25)
    expect(r.convencional.parcela).toBe(8_318.88)
    expect(r.convencional.parcelas).toBe(60)
  })

  it('estratégia: sem entrada, dívida reduzida em 145x', () => {
    expect(r.estrategia.entrada).toBe(0)
    // 1 centavo abaixo da referência: simularReducao arredonda uma vez só
    // (redução + consolidado = dívida), a referência arredonda cada parte
    expect(r.estrategia.consolidado).toBe(287_001.47)
    expect(r.estrategia.parcela).toBe(1_979.32)
    expect(r.estrategia.parcelas).toBe(145)
  })

  it('economia e parcela menor batem com a referência', () => {
    expect(r.economiaMensal).toBe(6_339.56)
    expect(r.economiaAnual).toBe(76_074.72)
    expect(r.parcelaMenorPct).toBe(76)
  })

  it('investimento: parcela do honorário, ROI e % do recuperado', () => {
    expect(r.reducaoValor).toBe(336_914.78)
    expect(r.investimentoParcela).toBe(1_583.33)
    expect(Math.round(r.roi)).toBe(35)
    expect(r.percentualRecuperado).toBeCloseTo(2.82, 1)
  })

  it('sem dívida devolve null', () => {
    expect(
      compararSolucoes({ dividaTotal: 0, reducaoPct: 54, valorEstrategia: 9_500, qtdParcelas: 6 }),
    ).toBeNull()
  })

  it('honorário zero não divide por zero', () => {
    const z = compararSolucoes({
      dividaTotal: 100_000,
      reducaoPct: 50,
      valorEstrategia: 0,
      qtdParcelas: 6,
    })!
    expect(z.roi).toBe(0)
    expect(z.percentualRecuperado).toBe(0)
  })
})
