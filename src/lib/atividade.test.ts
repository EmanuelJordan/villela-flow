import { describe, expect, it } from 'vitest'
import { matrizAtividade } from '@/lib/atividade'

// segunda-feira, 13/07/2026
const agora = new Date('2026-07-13T12:00:00-03:00')

describe('matrizAtividade', () => {
  it('gera 8 semanas em ordem cronológica com 7 dias cada', () => {
    const m = matrizAtividade([], agora)
    expect(m.semanas).toHaveLength(8)
    expect(m.semanas.every((s) => s.dias.length === 7)).toBe(true)
    expect(m.semanas[0].inicio.getTime()).toBeLessThan(m.semanas[7].inicio.getTime())
  })

  it('conta o evento na célula certa (semana atual, segunda-feira)', () => {
    const m = matrizAtividade(['2026-07-13T10:00:00-03:00'], agora)
    expect(m.semanas[7].dias[0]).toBe(1) // última semana, seg = índice 0
    expect(m.max).toBe(1)
  })

  it('domingo cai no índice 6 da semana anterior à atual', () => {
    const m = matrizAtividade(['2026-07-12T10:00:00-03:00'], agora)
    expect(m.semanas[6].dias[6]).toBe(1)
  })

  it('ignora datas fora da janela de 8 semanas', () => {
    const m = matrizAtividade(['2026-04-01T10:00:00-03:00', '2026-08-01T10:00:00-03:00'], agora)
    expect(m.max).toBe(0)
  })

  it('acumula várias ocorrências no mesmo dia e calcula o máximo', () => {
    const m = matrizAtividade(
      ['2026-07-13T08:00:00-03:00', '2026-07-13T09:00:00-03:00', '2026-07-10T09:00:00-03:00'],
      agora,
    )
    expect(m.semanas[7].dias[0]).toBe(2)
    expect(m.max).toBe(2)
  })
})
