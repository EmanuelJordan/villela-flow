'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { atualizarMembro } from '@/actions/administracao'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { normalizarPapel } from '@/lib/escopo'
import {
  PAPEIS_ATRIBUIVEIS,
  ROTULO_PAPEL_ADMIN,
  type EquipeAdmin,
  type MembroAdmin,
} from './tipos'

/** Tabela de membros aprovados: papel e equipe mudam direto no select da linha.
 *  A linha do próprio VP fica travada (anti-lockout — VP é único). */
export function MembrosTabela({
  membros,
  equipes,
  vpId,
}: {
  membros: MembroAdmin[]
  equipes: EquipeAdmin[]
  vpId: string
}) {
  const router = useRouter()
  const [pendente, startTransition] = useTransition()

  function mudar(
    m: MembroAdmin,
    mudanca: Partial<{ papel: 'franqueado' | 'franqueado_gestor'; teamId: string }>,
  ) {
    const papel = mudanca.papel ?? normalizarPapel(m.papel)
    const teamId = mudanca.teamId ?? m.team_id
    if (!teamId) return toast.error('Escolha uma equipe.')
    if (papel === 'vp') return // VP não é atribuível pela tabela
    startTransition(async () => {
      const r = await atualizarMembro({ userId: m.id, papel, teamId })
      if (!r.ok) {
        toast.error(r.erro)
        return
      }
      toast.success(`${m.nome} atualizado.`)
      router.refresh()
    })
  }

  const nomeEquipe = (id: string | null) => equipes.find((e) => e.id === id)?.nome ?? '—'

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Membros ({membros.length})
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Membro</th>
              <th className="pb-2 pr-4 font-medium">Papel</th>
              <th className="pb-2 pr-4 font-medium">Equipe</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {membros.map((m) => {
              const ehVp = m.id === vpId || normalizarPapel(m.papel) === 'vp'
              return (
                <tr key={m.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </td>
                  <td className="py-2.5 pr-4">
                    {ehVp ? (
                      <Badge variant="secondary">{ROTULO_PAPEL_ADMIN[m.papel] ?? m.papel}</Badge>
                    ) : (
                      <Select
                        value={normalizarPapel(m.papel)}
                        disabled={pendente}
                        onValueChange={(v) => mudar(m, { papel: v as 'franqueado' | 'franqueado_gestor' })}
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
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    {ehVp ? (
                      <span className="text-muted-foreground">{nomeEquipe(m.team_id)}</span>
                    ) : (
                      <Select
                        value={m.team_id ?? ''}
                        disabled={pendente}
                        onValueChange={(v) => mudar(m, { teamId: v })}
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
                    )}
                  </td>
                  <td className="py-2.5">
                    <Badge variant={m.status === 'approved' ? 'outline' : 'secondary'}>
                      {m.status === 'approved' ? 'Ativo' : m.status}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
