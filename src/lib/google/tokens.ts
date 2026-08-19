import 'server-only'
import { decryptToken, encryptToken } from '@/lib/crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { criarOAuthClient } from './oauth'

const MARGEM_MS = 5 * 60 * 1000

export class GoogleDesconectadoError extends Error {
  constructor() {
    super('Conta Google desconectada. Reconecte em Configurações.')
    this.name = 'GoogleDesconectadoError'
  }
}

export async function getValidGoogleAccessToken(userId: string): Promise<string> {
  const admin = createAdminClient()
  const { data: conn } = await admin
    .from('google_connections')
    .select('refresh_token_encrypted, access_token_encrypted, access_token_expires_at, status')
    .eq('user_id', userId)
    .single()

  if (!conn || conn.status !== 'connected') throw new GoogleDesconectadoError()

  const valido =
    conn.access_token_encrypted &&
    conn.access_token_expires_at &&
    new Date(conn.access_token_expires_at).getTime() > Date.now() + MARGEM_MS
  if (valido) return decryptToken(conn.access_token_encrypted!)

  // renovar via refresh token
  const client = criarOAuthClient()
  client.setCredentials({ refresh_token: decryptToken(conn.refresh_token_encrypted) })
  try {
    const { token } = await client.getAccessToken()
    if (!token) throw new Error('Google não retornou access token')
    const expiry = client.credentials.expiry_date
      ? new Date(client.credentials.expiry_date)
      : new Date(Date.now() + 50 * 60 * 1000)
    await admin
      .from('google_connections')
      .update({
        access_token_encrypted: encryptToken(token),
        access_token_expires_at: expiry.toISOString(),
      })
      .eq('user_id', userId)
    return token
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('invalid_grant')) {
      await admin.from('google_connections').update({ status: 'disconnected' }).eq('user_id', userId)
      throw new GoogleDesconectadoError()
    }
    throw err
  }
}
