'use client'

import { Pencil, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { criarEquipe, renomearEquipe } from '@/actions/administracao'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { EquipeAdmin, MembroAdmin } from './tipos'

/** Equipes: lista com contagem de membros, criação e renomeação. Sem exclusão
 *  de propósito — `team_id` é NOT NULL nas tabelas de negócio; apagar equipe
 *  com histórico órfão é decisão para quando houver necessidade real. */
export function EquipesSecao({
  equipes,
  membros,
}: {
  equipes: EquipeAdmin[]
  membros: MembroAdmin[]
}) {
  const router = useRouter()
  const [pendente, startTransition] = useTransition()
  // dialog único: null = fechado, 'nova' = criar, senão id da equipe em edição
  const [editando, setEditando] = useState<string | null>(null)
  const [nome, setNome] = useState('')

  const contagem = (teamId: string) => membros.filter((m) => m.team_id === teamId).length

  function abrir(alvo: 'nova' | EquipeAdmin) {
    setEditando(alvo === 'nova' ? 'nova' : alvo.id)
    setNome(alvo === 'nova' ? '' : alvo.nome)
  }

  function salvar() {
    startTransition(async () => {
      const r = editando === 'nova' ? await criarEquipe(nome) : await renomearEquipe(editando!, nome)
      if (!r.ok) {
        toast.error(r.erro)
        return
      }
      toast.success(editando === 'nova' ? 'Equipe criada.' : 'Equipe renomeada.')
      setEditando(null)
      router.refresh()
    })
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Equipes ({equipes.length})
        </h2>
        <Button size="sm" variant="outline" onClick={() => abrir('nova')}>
          <Plus className="size-3.5" /> Nova equipe
        </Button>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {equipes.map((eq) => (
          <li
            key={eq.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
          >
            <div>
              <p className="text-sm font-medium">{eq.nome}</p>
              <p className="text-xs text-muted-foreground">
                {contagem(eq.id)} {contagem(eq.id) === 1 ? 'membro' : 'membros'}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Renomear ${eq.nome}`}
              onClick={() => abrir(eq)}
            >
              <Pencil className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      <Dialog open={editando !== null} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editando === 'nova' ? 'Nova equipe' : 'Renomear equipe'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="adm-equipe-nome">Nome da equipe</Label>
            <Input
              id="adm-equipe-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Villela Interior SP"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  salvar()
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button disabled={pendente || nome.trim().length < 2} onClick={salvar}>
              {editando === 'nova' ? 'Criar' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
