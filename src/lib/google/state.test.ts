import { beforeAll, describe, expect, it } from 'vitest'

beforeAll(() => {
  process.env.GOOGLE_STATE_SECRET = 'segredo-de-teste'
})

describe('state OAuth', () => {
  it('roundtrip devolve o userId', async () => {
    const { signState, verifyState } = await import('@/lib/google/state')
    const userId = '3f2b8c1a-1111-2222-3333-444455556666'
    expect(verifyState(signState(userId))).toBe(userId)
  })
  it('state adulterado retorna null', async () => {
    const { signState, verifyState } = await import('@/lib/google/state')
    const s = signState('3f2b8c1a-1111-2222-3333-444455556666')
    expect(verifyState(s.slice(0, -2) + 'zz')).toBeNull()
    expect(verifyState('lixo')).toBeNull()
  })
})
