'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { cadastrar, type AuthState } from '@/actions/auth'
import { AuthSubmitButton } from '@/components/auth/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(cadastrar, {})
  return (
    <div>
      <h1 className="font-display text-[1.65rem] font-medium tracking-tight text-foreground">
        Criar conta
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Crie seu acesso para acompanhar o funil da equipe.
      </p>
      <form action={formAction} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" required className="h-11" />
        </div>
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
          <Label htmlFor="senha">Senha (mín. 8 caracteres)</Label>
          <Input
            id="senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            minLength={8}
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
          {pending ? 'Criando…' : 'Criar conta'}
        </AuthSubmitButton>
      </form>
      <p className="mt-7 text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link
          href="/login"
          className="font-medium text-[var(--villela-teal-escuro)] underline-offset-4 hover:text-primary hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  )
}
