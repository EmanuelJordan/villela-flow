import { describe, expect, it } from 'vitest'
import { gerarTokenProposta } from './token'

describe('gerarTokenProposta', () => {
  it('gera prefixo prop_ + 32 chars base64url (24 bytes)', () => {
    const token = gerarTokenProposta()
    expect(token).toMatch(/^prop_[A-Za-z0-9_-]{32}$/)
  })

  it('dois tokens nunca coincidem', () => {
    expect(gerarTokenProposta()).not.toBe(gerarTokenProposta())
  })
})
