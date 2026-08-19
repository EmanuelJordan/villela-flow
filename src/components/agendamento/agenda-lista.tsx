'use client'

import { format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Video } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { atualizarStatusAgendamento } from '@/actions/agendamentos'
import { AgendamentoAcoes } from '@/components/agendamento/agendamento-acoes'
import { BotaoCopiar, codigoDoMeet, ReuniaoDialog } from '@/components/agendamento/reuniao-dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

type Agendamento = {
  id: string
  titulo: string
  descricao: string | null
  inicio: string
  fim: string
  status: string
  meet_link: string | null
  lead: { nome_cliente: string } | null
  owner: { nome: string } | null
}

const STATUS_ROTULO: Record<string, string> = {
  agendado: 'Agendado',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
  nao_compareceu: 'Não compareceu',
}

export function AgendaLista({ agendamentos }: { agendamentos: Agendamento[] }) {
  const [, startTransition] = useTransition()
  const [detalhe, setDetalhe] = useState<Agendamento | null>(null)

  if (agendamentos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum agendamento nos próximos 7 dias.</p>
  }

  const dias: { dia: Date; itens: Agendamento[] }[] = []
  for (const a of agendamentos) {
    const dia = new Date(a.inicio)
    const grupo = dias.find((g) => isSameDay(g.dia, dia))
    if (grupo) grupo.itens.push(a)
    else dias.push({ dia, itens: [a] })
  }

  return (
    <div className="space-y-5">
      {dias.map(({ dia, itens }) => (
        <section key={dia.toISOString()}>
          <h3 className="font-display mb-2 text-sm font-semibold capitalize text-muted-foreground">
            {format(dia, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h3>
          <div className="space-y-2">
            {itens.map((a) => (
              <Card key={a.id} className="group">
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(a.inicio), 'HH:mm')}–{format(new Date(a.fim), 'HH:mm')}
                      {a.lead ? ` · ${a.lead.nome_cliente}` : ''}
                      {a.owner ? ` · ${a.owner.nome}` : ''}
                    </p>
                    {a.meet_link && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-xs font-medium select-all">
                          <Video className="size-3.5 text-muted-foreground" />
                          {codigoDoMeet(a.meet_link) ?? 'Meet'}
                        </span>
                        <BotaoCopiar texto={a.meet_link} rotulo="Copiar link" size="sm" variant="ghost" />
                      </div>
                    )}
                    <button
                      type="button"
                      className="mt-1 text-xs text-primary underline-offset-4 hover:underline"
                      onClick={() => setDetalhe(a)}
                    >
                      Ver detalhes
                    </button>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <AgendamentoAcoes agendamento={a} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Badge variant={a.status === 'agendado' ? 'default' : 'secondary'}>
                            {STATUS_ROTULO[a.status]}
                          </Badge>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {Object.entries(STATUS_ROTULO).map(([valor, rotulo]) => (
                          <DropdownMenuItem
                            key={valor}
                            onClick={() =>
                              startTransition(async () => {
                                const r = await atualizarStatusAgendamento(a.id, valor as never)
                                if (!r.ok) toast.error(r.erro)
                              })
                            }
                          >
                            {rotulo}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {/* portalizado — fica fora do fluxo do layout */}
      <ReuniaoDialog
        titulo="Detalhes da reunião"
        reuniao={
          detalhe && {
            titulo: detalhe.titulo,
            descricao: detalhe.descricao,
            inicio: detalhe.inicio,
            fim: detalhe.fim,
            cliente: detalhe.lead?.nome_cliente ?? null,
            meetLink: detalhe.meet_link,
          }
        }
        open={detalhe !== null}
        onOpenChange={(v) => !v && setDetalhe(null)}
      />
    </div>
  )
}
