'use client'

import { format } from 'date-fns'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { registrarPagamento } from '@/actions/propostas'
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
import { Textarea } from '@/components/ui/textarea'
import type { CardFunil } from '@/lib/funil-unificado/tipos'
import { formatBRL } from '@/lib/utils'

const METODOS = ['PIX', 'Boleto', 'Cartão', 'Transferência']

export function RegistrarPagamentoDialog({
  card,
  onFechar,
  onSucesso,
}: {
  card: CardFunil | null
  onFechar: () => void
  onSucesso: () => void
}) {
  const [valor, setValor] = useState('')
  const [data, setData] = useState('')
  const [metodo, setMetodo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [pendente, startTransition] = useTransition()

  // reidrata em fase de render, sem effect
  const [cardAnterior, setCardAnterior] = useState(card)
  if (card !== cardAnterior) {
    setCardAnterior(card)
    if (card) {
      // o combinado é o valor da estratégia; entrada parcial é só editar
      setValor(card.proposta ? String(card.proposta.valorEstrategia) : '')
      setData(format(new Date(), 'yyyy-MM-dd'))
      setMetodo('')
      setDescricao('')
    }
  }

  const combinado = card?.proposta?.valorEstrategia ?? null
  const parcial = combinado !== null && Number(valor) > 0 && Number(valor) < combinado

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!card?.proposta) return
    startTransition(async () => {
      const r = await registrarPagamento({
        proposta_id: card.proposta!.id,
        valor_pago: Number(valor),
        data_pagamento: data,
        metodo_pagamento: metodo,
        descricao,
      })
      if (!r.ok) {
        toast.error(r.erro)
        return
      }
      toast.success('Pagamento registrado.')
      onSucesso()
    })
  }

  return (
    <Dialog open={card !== null} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>
            {card?.empresa}
            {combinado !== null && ` · combinado ${formatBRL(combinado)}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pag-valor">Valor pago *</Label>
              <Input
                id="pag-valor"
                type="number"
                min="0"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pag-data">Data *</Label>
              <Input
                id="pag-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pag-metodo">Método</Label>
            <Input
              id="pag-metodo"
              list="metodos-pagamento"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              placeholder="PIX, boleto…"
            />
            <datalist id="metodos-pagamento">
              {METODOS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pag-descricao">Observação</Label>
            <Textarea
              id="pag-descricao"
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          {parcial && (
            <p className="rounded-md bg-accent/40 px-3 py-2 text-xs text-muted-foreground">
              Abaixo do combinado — o card vai para Contratos pagos do mesmo jeito. Um pagamento
              por proposta: para corrigir, desfaça pelo painel do card e lance de novo.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendente}>
              {pendente ? 'Salvando…' : 'Registrar pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
