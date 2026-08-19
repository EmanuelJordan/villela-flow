import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Rotas de quem ainda não entrou — usuário logado é devolvido para /home. */
const ROTAS_ANONIMAS = ['/login', '/cadastro']

/** Rotas abertas a qualquer um, com ou sem sessão: a apresentação da proposta
 *  é enviada ao cliente por link. A barra final importa — sem ela, um futuro
 *  "/propostas" interno ficaria público por acidente. */
const ROTAS_ABERTAS = ['/proposta/']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANTE: não inserir lógica entre createServerClient e getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // aberta para todos — inclusive o franqueado logado conferindo o que enviou
  if (ROTAS_ABERTAS.some((r) => pathname.startsWith(r))) {
    return supabaseResponse
  }

  const ehAnonima = ROTAS_ANONIMAS.some((r) => pathname.startsWith(r))

  if (!user && !ehAnonima) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  if (user && ehAnonima) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
