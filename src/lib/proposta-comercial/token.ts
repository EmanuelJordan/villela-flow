import 'server-only'
import { randomBytes } from 'node:crypto'

/** 'prop_' + 24 bytes em base64url (~32 chars, 192 bits): a URL pública é
 *  protegida só pelo segredo do token, então ele precisa ser impossível de
 *  adivinhar ou enumerar. */
export function gerarTokenProposta(): string {
  return `prop_${randomBytes(24).toString('base64url')}`
}
