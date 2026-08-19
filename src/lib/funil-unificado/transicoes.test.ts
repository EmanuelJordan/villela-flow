import { describe, expect, it } from 'vitest'
import { avaliarTransicao } from '@/lib/funil-unificado/transicoes'
import { BLOCOS, type Etapa } from '@/lib/funil-unificado/tipos'

const TODAS = BLOCOS.flatMap((b) => b.etapas)
const tipo = (de: Etapa, para: Etapa) => avaliarTransicao(de, para).tipo

describe('avaliarTransicao', () => {
  it('dentro da Agenda é livre nos dois sentidos', () => {
    const agenda: Etapa[] = ['agendado', 'efetiva', 'nao_efetiva']
    for (const de of agenda) for (const para of agenda) expect(tipo(de, para)).toBe('direta')
  })

  it('alternar espelhamento é livre', () => {
    expect(tipo('proposta_sem_esp', 'proposta_com_esp')).toBe('direta')
    expect(tipo('proposta_com_esp', 'proposta_sem_esp')).toBe('direta')
  })

  it('efetiva vira proposta pedindo os valores', () => {
    expect(tipo('efetiva', 'proposta_sem_esp')).toBe('pede-proposta')
    expect(tipo('efetiva', 'proposta_com_esp')).toBe('pede-proposta')
  })

  it('reunião não efetiva ou ainda por acontecer não vira proposta', () => {
    for (const de of ['agendado', 'nao_efetiva'] as Etapa[]) {
      const r = avaliarTransicao(de, 'proposta_sem_esp')
      expect(r.tipo).toBe('bloqueada')
      expect(r.tipo === 'bloqueada' && r.motivo).toMatch(/efetiva/i)
    }
  })

  it('proposta vira contrato sem diálogo, mas não pula para pago', () => {
    expect(tipo('proposta_sem_esp', 'contrato_nao_pago')).toBe('direta')
    expect(tipo('proposta_com_esp', 'contrato_pago')).toBe('bloqueada')
  })

  it('pagamento é o único caminho para Contratos pagos', () => {
    expect(tipo('contrato_nao_pago', 'contrato_pago')).toBe('pede-pagamento')
    for (const de of TODAS) {
      if (de === 'contrato_nao_pago' || de === 'contrato_pago') continue
      expect(tipo(de, 'contrato_pago')).toBe('bloqueada')
    }
  })

  it('estornar pagamento não é pelo arrasto', () => {
    expect(tipo('contrato_pago', 'contrato_nao_pago')).toBe('bloqueada')
  })

  it('nenhum retrocesso de bloco passa', () => {
    const depois: Record<string, number> = { agenda: 0, propostas: 1, contratos: 2 }
    for (const de of TODAS) {
      for (const para of TODAS) {
        const blocoDe = BLOCOS.find((b) => b.etapas.includes(de))!.id
        const blocoPara = BLOCOS.find((b) => b.etapas.includes(para))!.id
        if (depois[blocoDe] > depois[blocoPara]) expect(tipo(de, para)).toBe('bloqueada')
      }
    }
  })

  it('soltar na mesma coluna não faz nada', () => {
    for (const e of TODAS) expect(tipo(e, e)).toBe('direta')
  })
})
