import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LinhaEquipe } from '@/lib/ranking'
import { formatBRLCompacto } from '@/lib/utils'

/**
 * Comparativo entre equipes (dashboard do VP). Mesma linguagem visual do
 * ranking de vendedores: barra única em teal para a medida (valor fechado),
 * identidade pelo nome da equipe.
 */
export function ComparativoEquipes({ dados }: { dados: LinhaEquipe[] }) {
  const max = Math.max(1, ...dados.map((d) => d.valorFechado))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comparativo de equipes</CardTitle>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma equipe cadastrada.
          </p>
        ) : (
          <ol className="divide-y divide-border">
            {dados.map((e, i) => (
              <li key={e.teamId} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                <span className="w-5 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{e.nome}</p>
                    <Badge variant="secondary" className="shrink-0 text-[0.65rem] tabular-nums">
                      {e.taxaConversao}% conversão
                    </Badge>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-[var(--villela-teal-escuro)]"
                      style={{ width: `${Math.max(2, (e.valorFechado / max) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-sm font-semibold tabular-nums">
                    {formatBRLCompacto(e.valorFechado)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.fechamentos} fech. · {e.leads} leads · {e.agendamentos} reun.
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
