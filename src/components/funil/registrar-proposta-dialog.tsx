'use client'

import { addDays, format } from 'date-fns'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { registrarProposta } from '@/actions/propostas'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { reducaoPercentual } from '@/lib/funil-unificado/classificar'
import type { CardFunil, Etapa } from '@/lib/funil-unificado/tipos'
import { formatBRL } from '@/lib/utils'

const VALIDADE_PADRAO_DIAS = 15

export function RegistrarPropostaDialog({
  card,
  destino,
  onFechar,
  onSucesso,
}: {
  card: CardFunil | null
  destino: Etapa
  onFechar: () => void
  onSucesso: () => void
}) {
  const [divida, setDivida] = useState('')
  const [estrategia, setEstrategia] = useState('')
  const [validade, setValidade] = useState('')
  const [espelhamento, setEspelhamento] = useState(destino === 'proposta_com_esp')
  const [pendente, startTransition] = useTransition()

  // o diálogo é reaproveitado entre cards; reidrata em fase de render (mesmo padrão
  // de estado derivado — sem effect, sem render em cascata)
  const chave = `${card?.id ?? ''}|${destino}`
  const [chaveAnterior, setChaveAnterior] = useState(chave)
  if (chave !== chaveAnterior) {
    setChaveAnterior(chave)
    if (card) {
      setDivida(card.valorDivida != null ? String(card.valorDivida) : '')
      setEstrategia('')
      setValidade(format(addDays(new Date(), VALIDADE_PADRAO_DIAS), 'yyyy-MM-dd'))
      setEspelhamento(destino === 'proposta_com_esp')
    }
  }

  const nDivida = Number(divida)
  const nEstrategia = Number(estrategia)
  const previa =
    nDivida > 0 && nEstrategia > 0 && nEstrategia <= nDivida
      ? { reducao: nDivida - nEstrategia, percentual: reducaoPercentual(nDivida, nEstrategia) }
      : null

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!card) return
    startTransition(async () => {
      const r = await registrarProposta({
        agendamento_id: card.id,
        valor_total_divida: nDivida,
        valor_estrategia: nEstrategia,
        espelhamento,
        data_validade: validade || undefined,
      })
      if (!r.ok) {
        toast.error(r.erro)
        return
      }
      toast.success('Proposta registrada.')
      onSucesso()
    })
  }

  return (
    <Dialog open={card !== null} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar proposta</DialogTitle>
          <DialogDescription>{card?.empresa}</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prop-divida">Dívida total *</Label>
              <Input
                id="prop-divida"
                type="number"
                min="0"
                step="0.01"
                value={divida}
                onChange={(e) => setDivida(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-estrategia">Valor da estratégia *</Label>
              <Input
                id="prop-estrategia"
                type="number"
                min="0"
                step="0.01"
                value={estrategia}
                onChange={(e) => setEstrategia(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prop-validade">Validade da proposta</Label>
            <Input
              id="prop-validade"
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Espelhamento</p>
              <p className="text-xs text-muted-foreground">Proposta acompanhada pelo jurídico.</p>
            </div>
            <Switch checked={espelhamento} onCheckedChange={setEspelhamento} />
          </div>

          {previa && (
            <p className="rounded-md bg-accent/40 px-3 py-2 text-sm">
              Redução de{' '}
              <span className="font-display font-semibold">{formatBRL(previa.reducao)}</span> —{' '}
              <span className="font-display font-semibold">{previa.percentual}%</span> da dívida.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendente}>
              {pendente ? 'Salvando…' : 'Registrar proposta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
