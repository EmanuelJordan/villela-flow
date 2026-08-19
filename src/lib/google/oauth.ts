import 'server-only'
import { OAuth2Client } from 'google-auth-library'

export const SCOPE_CALENDAR = 'https://www.googleapis.com/auth/calendar.events'

export function criarOAuthClient(): OAuth2Client {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!,
  )
}

export function gerarUrlAutorizacao(state: string): string {
  return criarOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [SCOPE_CALENDAR, 'https://www.googleapis.com/auth/userinfo.email'],
    include_granted_scopes: true,
    state,
  })
}
