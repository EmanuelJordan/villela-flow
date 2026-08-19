import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function chave(): Buffer {
  const k = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY ?? '', 'base64')
  if (k.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY deve ter 32 bytes em base64')
  return k
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', chave(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64')
}

export function decryptToken(payload: string): string {
  const buf = Buffer.from(payload, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const dados = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', chave(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(dados), decipher.final()]).toString('utf8')
}
