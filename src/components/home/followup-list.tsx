'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { concluirFollowup } from '@/actions/followups'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Item = {
  id: string
  descricao: string
  vence_em: string
  lead_id: string
  situacao: 'vencido' | 'hoje'
  lead: { nome_cliente: string } | null
}

export function FollowUpList({ itens }: { itens: Item[] }) {
  const [pendente, startTransition] = useTransition()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Follow-ups que precisam de atenção</CardTitle>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tudo em dia por aqui.</p>
        ) : (
          <ul className="space-y-2">
            {itens.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <Badge variant={f.situacao === 'vencido' ? 'destructive' : 'secondary'} className="mr-2">
                    {f.situacao === 'vencido' ? 'Vencido' : 'Hoje'}
                  </Badge>
                  <span className="font-medium">{f.lead?.nome_cliente ?? 'Lead'}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    — {f.descricao} ({format(new Date(f.vence_em), 'dd/MM HH:mm', { locale: ptBR })})
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pendente}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await concluirFollowup(f.id, f.lead_id)
                      if (!r.ok) toast.error(r.erro)
                    })
                  }
                >
                  Concluir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
