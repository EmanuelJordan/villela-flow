import { describe, expect, it } from 'vitest'
import { agendamentoSchema, remarcarSchema } from '@/lib/validators/agendamento'

const base = {
  titulo: 'Reunião diagnóstico',
  inicio: '2026-07-15T14:00',
  fim: '2026-07-15T15:00',
}

describe('agendamentoSchema', () => {
  it('aceita agendamento válido', () => {
    expect(agendamentoSchema.safeParse(base).success).toBe(true)
  })
  it('rejeita fim antes do início', () => {
    expect(agendamentoSchema.safeParse({ ...base, fim: '2026-07-15T13:00' }).success).toBe(false)
  })
  it('rejeita título vazio', () => {
    expect(agendamentoSchema.safeParse({ ...base, titulo: '' }).success).toBe(false)
  })
})

describe('remarcarSchema', () => {
  it('aceita novo horário válido', () => {
    expect(remarcarSchema.safeParse({ inicio: base.inicio, fim: base.fim }).success).toBe(true)
  })
  it('rejeita fim antes do início', () => {
    expect(remarcarSchema.safeParse({ inicio: base.fim, fim: base.inicio }).success).toBe(false)
  })
  it('rejeita início igual ao fim', () => {
    expect(remarcarSchema.safeParse({ inicio: base.inicio, fim: base.inicio }).success).toBe(false)
  })
})
