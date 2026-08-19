'use client'

import { Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Fragment, useTransition } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface OpcaoVisao {
  valor: string
  rotulo: string
}

/** Seletor de visão do header — VP escolhe uma equipe (ou todas), gestor
 *  alterna entre a equipe, os próprios dados ou um membro. A escolha vive num
 *  cookie e acompanha o usuário por todas as telas; quem valida é o
 *  `resolverVisao` no servidor (a seleção só estreita o que o papel permite).
 *  Franqueado não tem escolha — o layout nem renderiza este componente. */
export function SeletorVisao({
  atual,
  opcoes,
  separarApos,
}: {
  atual: string
  opcoes: OpcaoVisao[]
  /** Índice depois do qual entra um separador (ex.: entre visões e membros). */
  separarApos?: number
}) {
  const router = useRouter()
  const [pendente, startTransition] = useTransition()

  function escolher(valor: string) {
    // ~180 dias; path=/ para valer em todas as telas
    document.cookie = `visao=${encodeURIComponent(valor)}; path=/; max-age=15552000; samesite=lax`
    startTransition(() => router.refresh())
  }

  return (
    <Select value={atual} onValueChange={escolher} disabled={pendente}>
      <SelectTrigger
        size="sm"
        className="w-44 gap-1.5 border-border/70 bg-muted/40"
        aria-label="Escolher visão dos dados"
      >
        <Users className="size-3.5 shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {opcoes.map((o, i) => (
          <Fragment key={o.valor}>
            {separarApos != null && i === separarApos + 1 && <SelectSeparator />}
            <SelectItem value={o.valor}>{o.rotulo}</SelectItem>
          </Fragment>
        ))}
      </SelectContent>
    </Select>
  )
}
