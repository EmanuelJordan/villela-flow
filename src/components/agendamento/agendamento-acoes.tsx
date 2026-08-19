'use client'

import { addMinutes, differenceInMinutes, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarClock, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { excluirAgendamento, remarcarAgendamento } from '@/actions/agendamentos'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Alvo = { id: string; titulo: string; inicio: string; fim: string; meet_link: string | null }

const paraInput = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm")

export function AgendamentoAcoes({ agendamento }: { agendamento: Alvo }) {
  const [remarcando, setRemarcando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [inicio, setInicio] = useState(() => paraInput(agendamento.inicio))
  const [fim, setFim] = useState(() => paraInput(agendamento.fim))
  const [pendente, startTransition] = useTransition()

  // recarrega dos props ao abrir — o estado inicial fica velho depois de um revalidate
  function abrirRemarcar() {
    setInicio(paraInput(agendamento.inicio))
    setFim(paraInput(agendamento.fim))
    setRemarcando(true)
  }

  function aoMudarInicio(v: string) {
    const duracao = differenceInMinutes(new Date(fim), new Date(inicio)) || 60
    setInicio(v)
    if (v) setFim(format(addMinutes(new Date(v), duracao), "yyyy-MM-dd'T'HH:mm"))
  }

  function confirmarRemarcacao(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const r = await remarcarAgendamento(agendamento.id, { inicio: new Date(inicio), fim: new Date(fim) })
      if (!r.ok) {
        toast.error(r.erro)
        return
      }
      if (r.avisoGoogle) toast.warning(r.avisoGoogle)
      else toast.success('Reunião remarcada — o mesmo link do Meet continua valendo.')
      setRemarcando(false)
    })
  }

  function confirmarExclusao() {
    startTransition(async () => {
      const r = await excluirAgendamento(agendamento.id)
      if (!r.ok) {
        toast.error(r.erro)
        return
      }
      if (r.avisoGoogle) toast.warning(r.avisoGoogle)
      else toast.success('Reunião excluída.')
      setExcluindo(false)
    })
  }

  return (
    <>
      {/* aparece no hover; sempre visível no toque e ao navegar por teclado */}
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={abrirRemarcar}
          title="Remarcar"
          aria-label={`Remarcar ${agendamento.titulo}`}
        >
          <CalendarClock />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setExcluindo(true)}
          title="Excluir"
          aria-label={`Excluir ${agendamento.titulo}`}
        >
          <Trash2 />
        </Button>
      </div>

      <Dialog open={remarcando} onOpenChange={setRemarcando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remarcar reunião</DialogTitle>
            <DialogDescription>
              {agendamento.titulo}
              {agendamento.meet_link && ' · O link do Meet não muda e os convidados são avisados.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={confirmarRemarcacao} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Novo início</Label>
                <Input
                  type="datetime-local"
                  step={1800}
                  value={inicio}
                  onChange={(e) => aoMudarInicio(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Novo fim</Label>
                <Input
                  type="datetime-local"
                  step={1800}
                  value={fim}
                  onChange={(e) => setFim(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pendente}>
                {pendente ? 'Remarcando…' : 'Confirmar novo horário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={excluindo} onOpenChange={setExcluindo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir esta reunião?</DialogTitle>
            <DialogDescription>
              {agendamento.titulo} — {format(new Date(agendamento.inicio), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}.
              {agendamento.meet_link
                ? ' O evento sai do Google Calendar, os convidados são avisados e o link do Meet deixa de funcionar.'
                : ''}{' '}
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={confirmarExclusao} disabled={pendente}>
              <Trash2 />
              {pendente ? 'Excluindo…' : 'Excluir reunião'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
