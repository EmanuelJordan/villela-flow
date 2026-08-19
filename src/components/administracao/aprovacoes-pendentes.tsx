'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { aprovarMembro, recusarMembro } from '@/actions/administracao'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAPEIS_ATRIBUIVEIS, type EquipeAdmin, type MembroAdmin } from './tipos'

/** Fila de aprovação: cadastro novo nasce pendente e sem equipe — o VP define
 *  papel + equipe aqui e libera (ou recusa, apagando a conta). */
export function AprovacoesPendentes({
  pendentes,
  equipes,
}: {
  pendentes: MembroAdmin[]
  equipes: EquipeAdmin[]
}) {
  const router = useRouter()
  const [pendente, startTransition] = useTransition()
  // escolha por usuário antes de aprovar; defaults: franqueado na primeira equipe
  const [escolhas, setEscolhas] = useState<Record<string, { papel: string; teamId: string }>>({})

  const escolhaDe = (id: string) => ({
    papel: escolhas[id]?.papel ?? 'franqueado',
    teamId: escolhas[id]?.teamId ?? equipes[0]?.id ?? '',
  })

  function aprovar(m: MembroAdmin) {
    const { papel, teamId } = escolhaDe(m.id)
    if (!teamId) return toast.error('Crie uma equipe antes de aprovar.')
    startTransition(async () => {
      const r = await aprovarMembro({ userId: m.id, papel: papel as 'franqueado' | 'franqueado_gestor', teamId })
      if (!r.ok) {
        toast.error(r.erro)
        return
      }
      toast.success(`${m.nome} aprovado.`)
      router.refresh()
    })
  }

  function recusar(m: MembroAdmin) {
    startTransition(async () => {
      const r = await recusarMembro(m.id)
      if (!r.ok) {
        toast.error(r.erro)
        return
      }
      toast.success(`Cadastro de ${m.nome} recusado e removido.`)
      router.refresh()
    })
  }

  return (
    <section className="rounded-xl border border-[var(--villela-teal)]/40 bg-accent/30 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Aguardando aprovação ({pendentes.length})
      </h2>
      <ul className="mt-4 space-y-3">
        {pendentes.map((m) => {
          const escolha = escolhaDe(m.id)
          return (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="min-w-40 flex-1">
                <p className="text-sm font-medium">{m.nome}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
              <Select
                value={escolha.papel}
                onValueChange={(v) => setEscolhas((e) => ({ ...e, [m.id]: { ...escolha, papel: v } }))}
              >
                <SelectTrigger size="sm" className="w-44" aria-label={`Papel de ${m.nome}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPEIS_ATRIBUIVEIS.map((p) => (
                    <SelectItem key={p.valor} value={p.valor}>
                      {p.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={escolha.teamId}
                onValueChange={(v) => setEscolhas((e) => ({ ...e, [m.id]: { ...escolha, teamId: v } }))}
              >
                <SelectTrigger size="sm" className="w-44" aria-label={`Equipe de ${m.nome}`}>
                  <SelectValue placeholder="Equipe…" />
                </SelectTrigger>
                <SelectContent>
                  {equipes.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={pendente} onClick={() => aprovar(m)}>
                  Aprovar
                </Button>
                <Button size="sm" variant="ghost" disabled={pendente} onClick={() => recusar(m)}>
                  Recusar
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
