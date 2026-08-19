import { beforeAll, describe, expect, it } from 'vitest'
import { extrairDiagnostico } from '@/lib/diagnostico/parser'

beforeAll(() => {
  process.env.STUB_DELAY_MS = '0'
})

describe('extrairDiagnostico (stub)', () => {
  it('é determinístico: mesma URL → mesmos dados', async () => {
    const a = await extrairDiagnostico('https://diagnostico.suaempresa.com.br/r/abc123')
    const b = await extrairDiagnostico('https://diagnostico.suaempresa.com.br/r/abc123')
    expect(a).toEqual(b)
    expect(a.sucesso).toBe(true)
    expect(a.fonte).toBe('stub')
  })

  it('URLs diferentes → dados diferentes', async () => {
    const a = await extrairDiagnostico('https://diagnostico.suaempresa.com.br/r/abc123')
    const b = await extrairDiagnostico('https://diagnostico.suaempresa.com.br/r/xyz999')
    expect(`${a.dados!.nomeCliente}|${a.dados!.cpfCnpj}`).not.toBe(`${b.dados!.nomeCliente}|${b.dados!.cpfCnpj}`)
  })

  it('valor da dívida no range plausível (R$15k–R$2mi)', async () => {
    const r = await extrairDiagnostico('https://diagnostico.suaempresa.com.br/r/abc123')
    expect(r.dados!.valorDivida).toBeGreaterThanOrEqual(15_000)
    expect(r.dados!.valorDivida).toBeLessThanOrEqual(2_000_000)
  })

  it('rejeita URL inválida', async () => {
    const r = await extrairDiagnostico('nao-e-url')
    expect(r.sucesso).toBe(false)
    expect(r.erro).toBeTruthy()
  })

  it('CNPJ extraído tem 14 dígitos', async () => {
    const r = await extrairDiagnostico('https://diagnostico.suaempresa.com.br/r/abc123')
    expect(r.dados!.cpfCnpj!.replace(/\D/g, '')).toHaveLength(14)
  })
})
