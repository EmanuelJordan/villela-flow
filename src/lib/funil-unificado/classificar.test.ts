import { describe, expect, it } from 'vitest'
import { classificar, reducaoPercentual } from '@/lib/funil-unificado/classificar'

const AGORA = new Date('2026-07-15T10:00:00-03:00')
const RECENTE = '2026-07-14T14:00:00-03:00' // reunião de ontem, dentro do prazo

/** Reunião com data configurável; o padrão é recente para não disparar o prazo. */
const ag = (status: string, inicio = RECENTE) => ({ status, inicio })

const proposta = (over: Partial<Parameters<typeof classificar>[1]> = {}) => ({
  espelhamento: false,
  enviada_em: '2026-07-10T12:00:00Z',
  contrato_status: 'nenhum',
  ...over,
})

describe('classificar', () => {
  it('sem proposta, segue o status da reunião', () => {
    expect(classificar(ag('agendado'), null, null, AGORA)).toBe('agendado')
    expect(classificar(ag('realizado'), null, null, AGORA)).toBe('efetiva')
    expect(classificar(ag('nao_compareceu'), null, null, AGORA)).toBe('nao_efetiva')
  })

  it('status desconhecido cai em agendado, não some do quadro', () => {
    expect(classificar(ag('inventado'), null, null, AGORA)).toBe('agendado')
  })

  it('reunião parada além do prazo vira não efetiva sozinha', () => {
    expect(classificar(ag('agendado', '2026-06-20T14:00:00-03:00'), null, null, AGORA)).toBe(
      'nao_efetiva',
    )
  })

  it('dentro do prazo segue agendada', () => {
    expect(classificar(ag('agendado', '2026-07-05T14:00:00-03:00'), null, null, AGORA)).toBe(
      'agendado',
    )
  })

  it('reunião marcada para o futuro não vence o prazo', () => {
    expect(classificar(ag('agendado', '2026-08-01T14:00:00-03:00'), null, null, AGORA)).toBe(
      'agendado',
    )
  })

  it('separa as propostas por espelhamento', () => {
    expect(classificar(ag('realizado'), proposta(), null, AGORA)).toBe('proposta_sem_esp')
    expect(classificar(ag('realizado'), proposta({ espelhamento: true }), null, AGORA)).toBe(
      'proposta_com_esp',
    )
  })

  it('contrato enviado ou assinado passa na frente da proposta', () => {
    for (const contrato_status of ['enviado', 'assinado']) {
      expect(
        classificar(ag('realizado'), proposta({ espelhamento: true, contrato_status }), null, AGORA),
      ).toBe('contrato_nao_pago')
    }
  })

  it('pagamento vence tudo — inclusive contrato ainda marcado como nenhum', () => {
    expect(classificar(ag('realizado'), proposta(), { id: 'pg1' }, AGORA)).toBe('contrato_pago')
    expect(
      classificar(ag('agendado'), proposta({ contrato_status: 'assinado' }), { id: 'pg1' }, AGORA),
    ).toBe('contrato_pago')
  })

  it('proposta ainda não enviada não move o card do bloco Agenda', () => {
    expect(classificar(ag('realizado'), proposta({ enviada_em: null }), null, AGORA)).toBe('efetiva')
  })

  it('reunião cancelada sai do quadro', () => {
    expect(classificar(ag('cancelado'), null, null, AGORA)).toBeNull()
  })

  it('cancelar a reunião não esconde contrato já fechado', () => {
    expect(classificar(ag('cancelado'), proposta(), { id: 'pg1' }, AGORA)).toBe('contrato_pago')
    expect(classificar(ag('cancelado'), proposta(), null, AGORA)).toBe('proposta_sem_esp')
  })
})

describe('reducaoPercentual', () => {
  it('calcula a redução com uma casa decimal', () => {
    expect(reducaoPercentual(100_000, 40_000)).toBe(60)
    expect(reducaoPercentual(340_000, 118_000)).toBe(65.3)
  })

  it('não estoura com dívida zerada ou negativa', () => {
    expect(reducaoPercentual(0, 0)).toBe(0)
    expect(reducaoPercentual(-1, 500)).toBe(0)
  })
})
