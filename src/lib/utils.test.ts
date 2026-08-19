import { describe, expect, it } from 'vitest'
import { formatBRL, formatBRLCompacto, formatCpfCnpj } from '@/lib/utils'

const semNbsp = (s: string) => s.replace(/ /g, ' ')

describe('formatBRL', () => {
  it('formata valores em reais pt-BR', () => {
    expect(semNbsp(formatBRL(1500))).toBe('R$ 1.500,00')
    expect(semNbsp(formatBRL(2_000_000))).toBe('R$ 2.000.000,00')
  })
  it('retorna travessão para nulo/indefinido', () => {
    expect(formatBRL(null)).toBe('—')
    expect(formatBRL(undefined)).toBe('—')
  })
})

describe('formatBRLCompacto', () => {
  it('compacta milhares e milhões em pt-BR', () => {
    expect(semNbsp(formatBRLCompacto(320_000))).toBe('R$ 320 mil')
    expect(semNbsp(formatBRLCompacto(1_250_000))).toBe('R$ 1,3 mi')
    expect(semNbsp(formatBRLCompacto(850))).toBe('R$ 850')
  })
  it('retorna travessão para nulo/indefinido', () => {
    expect(formatBRLCompacto(null)).toBe('—')
    expect(formatBRLCompacto(undefined)).toBe('—')
  })
})

describe('formatCpfCnpj', () => {
  it('mascara CPF (11 dígitos)', () => {
    expect(formatCpfCnpj('12345678901')).toBe('123.456.789-01')
  })
  it('mascara CNPJ (14 dígitos)', () => {
    expect(formatCpfCnpj('12345678000199')).toBe('12.345.678/0001-99')
  })
  it('devolve original se tamanho inesperado e travessão se vazio', () => {
    expect(formatCpfCnpj('123')).toBe('123')
    expect(formatCpfCnpj(null)).toBe('—')
  })
})
