import { describe, expect, it } from 'vitest'
import { janelaDoPeriodo, rangeDoPeriodo } from '@/lib/periodo'

const agora = new Date('2026-07-12T15:30:00-03:00')

describe('rangeDoPeriodo', () => {
  it('hoje = início do dia até agora', () => {
    const { inicio, fim } = rangeDoPeriodo('hoje', agora)
    expect(inicio.getHours()).toBe(0)
    expect(inicio.getDate()).toBe(agora.getDate())
    expect(fim).toEqual(agora)
  })
  it('7d = 7 dias atrás até agora', () => {
    const { inicio } = rangeDoPeriodo('7d', agora)
    expect(agora.getTime() - inicio.getTime()).toBe(7 * 24 * 60 * 60 * 1000)
  })
  it('mes = primeiro dia do mês', () => {
    const { inicio } = rangeDoPeriodo('mes', agora)
    expect(inicio.getDate()).toBe(1)
    expect(inicio.getMonth()).toBe(agora.getMonth())
  })
  it('semana termina agora — métrica não conta o que ainda não aconteceu', () => {
    const { fim } = rangeDoPeriodo('semana', agora)
    expect(fim).toEqual(agora)
  })
})

describe('janelaDoPeriodo', () => {
  it('hoje cobre o dia inteiro, não só até agora', () => {
    const { inicio, fim } = janelaDoPeriodo('hoje', agora)
    expect(inicio.getHours()).toBe(0)
    expect(fim.getHours()).toBe(23)
    expect(inicio.getDate()).toBe(fim.getDate())
    // uma reunião às 18h de hoje precisa entrar
    expect(new Date('2026-07-12T18:00:00-03:00') <= fim).toBe(true)
  })

  it('semana começa na segunda e termina no domingo', () => {
    // 2026-07-12 é um domingo — o caso que quebra quem usa o padrão do date-fns
    const { inicio, fim } = janelaDoPeriodo('semana', agora)
    expect(inicio.getDay()).toBe(1)
    expect(fim.getDay()).toBe(0)
    expect(inicio.getDate()).toBe(6)
    expect(fim.getDate()).toBe(12)
  })

  it('semana abraça o agora nos dois sentidos', () => {
    const quarta = new Date('2026-07-15T09:00:00-03:00')
    const { inicio, fim } = janelaDoPeriodo('semana', quarta)
    expect(inicio.getTime()).toBeLessThan(quarta.getTime())
    expect(fim.getTime()).toBeGreaterThan(quarta.getTime())
    // sexta desta semana entra
    expect(new Date('2026-07-17T14:00:00-03:00') <= fim).toBe(true)
    // segunda da semana seguinte não
    expect(new Date('2026-07-20T09:00:00-03:00') <= fim).toBe(false)
  })

  it('mes vai do dia 1 ao último dia', () => {
    const { inicio, fim } = janelaDoPeriodo('mes', agora)
    expect(inicio.getDate()).toBe(1)
    expect(fim.getDate()).toBe(31)
    expect(fim.getMonth()).toBe(inicio.getMonth())
  })

  it('mes respeita fevereiro', () => {
    const { fim } = janelaDoPeriodo('mes', new Date('2026-02-10T12:00:00-03:00'))
    expect(fim.getDate()).toBe(28)
  })

  it('semana atravessando a virada de mês não perde dias', () => {
    // 2026-07-01 é quarta: a semana começa em 29/jun e termina em 05/jul
    const { inicio, fim } = janelaDoPeriodo('semana', new Date('2026-07-01T10:00:00-03:00'))
    expect(inicio.getMonth()).toBe(5)
    expect(inicio.getDate()).toBe(29)
    expect(fim.getMonth()).toBe(6)
    expect(fim.getDate()).toBe(5)
  })
})
