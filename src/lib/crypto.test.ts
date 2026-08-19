import { beforeAll, describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

describe('crypto de tokens', () => {
  it('roundtrip: decrypt(encrypt(x)) === x', async () => {
    const { encryptToken, decryptToken } = await import('@/lib/crypto')
    const token = '1//refresh-token-de-teste-' + 'x'.repeat(80)
    expect(decryptToken(encryptToken(token))).toBe(token)
  })
  it('ciphertexts diferentes para o mesmo plaintext (IV aleatório)', async () => {
    const { encryptToken } = await import('@/lib/crypto')
    expect(encryptToken('abc')).not.toBe(encryptToken('abc'))
  })
  it('payload adulterado falha', async () => {
    const { encryptToken, decryptToken } = await import('@/lib/crypto')
    const enc = Buffer.from(encryptToken('abc'), 'base64')
    enc[enc.length - 1] ^= 0xff
    expect(() => decryptToken(enc.toString('base64'))).toThrow()
  })
})
