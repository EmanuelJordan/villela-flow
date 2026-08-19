import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LinhaRanking } from '@/lib/ranking'
import { formatBRLCompacto } from '@/lib/utils'

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * Ranking dos vendedores da equipe (dashboard do gestor). Barra única em teal
 * (uma medida — valor fechado); identidade vem do nome/avatar, não de cor.
 */
export function RankingVendedores({ dados }: { dados: LinhaRanking[] }) {
  const max = Math.max(1, ...dados.map((d) => d.valorFechado))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ranking da equipe</CardTitle>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sem atividade da equipe no período.
          </p>
        ) : (
          <ol className="divide-y divide-border">
            {dados.map((v, i) => (
              <li key={v.ownerId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="w-5 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <Avatar className="size-8">
                  <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                    {iniciais(v.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{v.nome}</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-[var(--villela-teal-escuro)]"
                      style={{ width: `${Math.max(2, (v.valorFechado / max) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-sm font-semibold tabular-nums">
                    {formatBRLCompacto(v.valorFechado)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {v.fechamentos} fech. · {v.leads} leads · {v.agendamentos} reun.
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
