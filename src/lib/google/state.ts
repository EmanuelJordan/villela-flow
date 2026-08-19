import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

function assinar(payload: string): string {
  return createHmac('sha256', process.env.GOOGLE_STATE_SECRET!).update(payload).digest('hex')
}

export function signState(userId: string): string {
  const payload = `${userId}.${randomBytes(8).toString('hex')}`
  return `${payload}.${assinar(payload)}`
}

export function verifyState(state: string): string | null {
  const partes = state.split('.')
  if (partes.length !== 3) return null
  const [userId, nonce, sig] = partes
  const esperado = assinar(`${userId}.${nonce}`)
  const a = Buffer.from(sig)
  const b = Buffer.from(esperado)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return userId
}
