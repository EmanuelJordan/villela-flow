import { NextResponse, type NextRequest } from 'next/server'
import { encryptToken } from '@/lib/crypto'
import { criarOAuthClient, SCOPE_CALENDAR } from '@/lib/google/oauth'
import { verifyState } from '@/lib/google/state'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function erroRedirect(motivo: string) {
  return NextResponse.redirect(new URL(`/configuracoes?erro=${encodeURIComponent(motivo)}`, process.env.APP_URL))
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  if (!code || !state) return erroRedirect('Autorização cancelada.')

  const userIdDoState = verifyState(state)
  if (!userIdDoState) return erroRedirect('State inválido — tente novamente.')

  // sessão atual deve bater com o state (evita fixation)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.id !== userIdDoState) return erroRedirect('Sessão não confere. Faça login e tente de novo.')

  const client = criarOAuthClient()
  let tokens
  try {
    ;({ tokens } = await client.getToken(code))
  } catch {
    // code já consumido (reload/voltar), expirado ou falha de rede
    return erroRedirect('Não foi possível concluir a autorização com o Google. Tente novamente.')
  }

  // consentimento granular: usuário pode ter desmarcado o Calendar
  if (!tokens.scope?.includes(SCOPE_CALENDAR)) {
    return erroRedirect('Permissão do Google Agenda não concedida — marque a caixa do Calendar.')
  }
  if (!tokens.refresh_token) return erroRedirect('Google não retornou refresh token. Tente novamente.')

  let googleEmail: string | null = null
  if (tokens.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString())
      googleEmail = payload.email ?? null
    } catch {
      googleEmail = null
    }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('google_connections').upsert({
    user_id: user.id,
    google_email: googleEmail,
    refresh_token_encrypted: encryptToken(tokens.refresh_token),
    access_token_encrypted: tokens.access_token ? encryptToken(tokens.access_token) : null,
    access_token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    status: 'connected',
    scopes: tokens.scope?.split(' ') ?? [],
  })
  if (error) return erroRedirect('Falha ao salvar a conexão.')

  return NextResponse.redirect(new URL('/configuracoes?conectado=1', process.env.APP_URL))
}
