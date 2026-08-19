'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthState = { erro?: string }

export async function entrar(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const senha = String(formData.get('senha') ?? '')
  if (!email || !senha) return { erro: 'Informe e-mail e senha.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) return { erro: 'E-mail ou senha inválidos.' }

  revalidatePath('/', 'layout')
  redirect('/home')
}

export async function cadastrar(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const nome = String(formData.get('nome') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const senha = String(formData.get('senha') ?? '')
  if (!nome || !email || senha.length < 8) {
    return { erro: 'Preencha nome, e-mail e uma senha com pelo menos 8 caracteres.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  })
  if (error) return { erro: `Não foi possível cadastrar: ${error.message}` }

  revalidatePath('/', 'layout')
  redirect('/home')
}

export async function sair() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
