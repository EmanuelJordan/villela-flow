import { describe, expect, it } from 'vitest'
import { calcularComparativo, calcularRanking } from '@/lib/ranking'

describe('calcularRanking', () => {
  const vendedores = [
    { id: 'a', nome: 'Ana' },
    { id: 'b', nome: 'Beto' },
    { id: 'c', nome: 'Clara' },
  ]

  it('agrega por vendedor e ordena por valor fechado desc', () => {
    const linhas = calcularRanking(
      vendedores,
      [{ owner_id: 'a' }, { owner_id: 'a' }, { owner_id: 'b' }],
      [{ owner_id: 'b' }],
      [
        { ownerId: 'b', valorDivida: 100_000 },
        { ownerId: 'a', valorDivida: 40_000 },
      ],
    )
    expect(linhas.map((l) => l.ownerId)).toEqual(['b', 'a', 'c'])
    expect(linhas[0]).toEqual({
      ownerId: 'b',
      nome: 'Beto',
      leads: 1,
      agendamentos: 1,
      fechamentos: 1,
      valorFechado: 100_000,
    })
  })

  it('vendedor sem atividade aparece zerado', () => {
    const linhas = calcularRanking(vendedores, [], [], [])
    expect(linhas).toHaveLength(3)
    expect(linhas[2]).toMatchObject({ leads: 0, fechamentos: 0, valorFechado: 0 })
  })

  it('ignora owner nulo ou desconhecido e valor nulo conta como zero', () => {
    const linhas = calcularRanking(
      [{ id: 'a', nome: 'Ana' }],
      [{ owner_id: null }, { owner_id: 'fantasma' }, { owner_id: 'a' }],
      [{ owner_id: null }],
      [{ ownerId: 'a', valorDivida: null }],
    )
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({ leads: 1, agendamentos: 0, fechamentos: 1, valorFechado: 0 })
  })
})

describe('calcularComparativo', () => {
  const equipes = [
    { id: 't1', nome: 'Matriz' },
    { id: 't2', nome: 'Campinas' },
  ]

  it('agrega por equipe com taxa de conversão', () => {
    const linhas = calcularComparativo(
      equipes,
      [{ team_id: 't1' }, { team_id: 't1' }, { team_id: 't1' }, { team_id: 't2' }],
      [{ team_id: 't2' }],
      [{ teamId: 't1', valorDivida: 200_000 }],
    )
    expect(linhas[0]).toEqual({
      teamId: 't1',
      nome: 'Matriz',
      leads: 3,
      agendamentos: 0,
      fechamentos: 1,
      valorFechado: 200_000,
      taxaConversao: 33,
    })
    expect(linhas[1].taxaConversao).toBe(0)
  })

  it('equipe sem leads tem taxa zero (sem divisão por zero)', () => {
    const linhas = calcularComparativo(equipes, [], [], [])
    expect(linhas.every((l) => l.taxaConversao === 0)).toBe(true)
  })
})
