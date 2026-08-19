import { NextResponse } from 'next/server'
import { gerarUrlAutorizacao } from '@/lib/google/oauth'
import { signState } from '@/lib/google/state'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', process.env.APP_URL))

  return NextResponse.redirect(gerarUrlAutorizacao(signState(user.id)))
}
