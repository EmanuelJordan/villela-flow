'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { entrar, type AuthState } from '@/actions/auth'
import { AuthSubmitButton } from '@/components/auth/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(entrar, {})
  return (
    <div>
      <h1 className="font-display text-[1.65rem] font-medium tracking-tight text-foreground">
        Entrar no sistema
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Acesso da equipe comercial do Grupo Villela.
      </p>
      <form action={formAction} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="nome@suaempresa.com.br"
            autoComplete="email"
            required
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            className="h-11"
          />
        </div>
        {state.erro && (
          <p role="alert" className="text-sm text-destructive">
            {state.erro}
          </p>
        )}
        <AuthSubmitButton disabled={pending}>
          {pending ? 'Entrando…' : 'Entrar'}
        </AuthSubmitButton>
      </form>
      <p className="mt-7 text-sm text-muted-foreground">
        Não tem conta?{' '}
        <Link
          href="/cadastro"
          className="font-medium text-[var(--villela-teal-escuro)] underline-offset-4 hover:text-primary hover:underline"
        >
          Cadastre-se
        </Link>
      </p>
    </div>
  )
}
