'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Item = {
  id: string
  titulo: string
  inicio: string
  meet_link: string | null
  lead: { nome_cliente: string } | null
}

export function ProximosAgendamentos({ itens }: { itens: Item[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Próximos agendamentos</CardTitle>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum agendamento futuro. Crie um na aba Agendamento.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {itens.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(a.inicio), "EEE dd/MM 'às' HH:mm", { locale: ptBR })}
                    {a.lead ? ` · ${a.lead.nome_cliente}` : ''}
                  </p>
                </div>
                {a.meet_link && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(a.meet_link!)
                      toast.success('Link do Meet copiado.')
                    }}
                  >
                    Meet
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
