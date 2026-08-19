'use client'

import { format, parseISO } from 'date-fns'
import { Eye, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { calcularParcela, calcularValidade } from '@/lib/proposta-comercial/calculos'
import type { PropostaComercialForm } from '@/lib/proposta-comercial/tipos'
import { formatBRL } from '@/lib/utils'
import { Secao } from './campo'

const n = (v: string) => {
  const x = Number(v)
  return v !== '' && Number.isFinite(x) ? x : 0
}

export function ResumoProposta({
  form,
  atualizando,
  pendente,
  onEditar,
  onPrevisualizar,
  onGerar,
}: {
  form: PropostaComercialForm
  /** true quando já existe proposta — o CTA vira "Atualizar". */
  atualizando: boolean
  pendente: boolean
  onEditar: () => void
  onPrevisualizar: () => void
  onGerar: () => void
}) {
  const p = form.precificacao
  const parcela = calcularParcela(n(p.valorEstrategia), n(p.qtdParcelas), p.temEntrada ? n(p.valorEntrada) : 0)
  const validaAte = calcularValidade(p.validadeDias)

  return (
    <div className="space-y-4">
      <Secao
        titulo="Condições comerciais da proposta"
        acao={
          <Button type="button" variant="ghost" size="sm" onClick={onEditar}>
            <Pencil className="size-3.5" /> Editar
          </Button>
        }
      >
        {p.tituloEstrategia && <p className="text-base font-semibold">{p.tituloEstrategia}</p>}
        <p className="mt-1 font-display text-3xl font-bold text-[color:var(--villela-teal-escuro)]">
          {formatBRL(n(p.valorEstrategia) || null)}
        </p>
        {p.descricaoEstrategia && (
          <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{p.descricaoEstrategia}</p>
        )}
        <div className="mt-4 space-y-1.5 text-sm">
          <p>
            <span className="text-muted-foreground">Pagamento: </span>
            <span className="font-medium">
              {n(p.qtdParcelas)}x de {parcela > 0 ? formatBRL(parcela) : '—'}
            </span>
          </p>
          {p.temEntrada && n(p.valorEntrada) > 0 && (
            <p>
              <span className="text-muted-foreground">Entrada: </span>
              <span className="font-medium">{formatBRL(n(p.valorEntrada))}</span>
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Proposta válida até </span>
            <span className="font-medium">{format(parseISO(validaAte), 'dd/MM/yyyy')}</span>
          </p>
        </div>
      </Secao>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onPrevisualizar}>
          <Eye className="size-4" /> Pré-visualizar proposta
        </Button>
        <Button type="button" size="lg" disabled={pendente} onClick={onGerar}>
          {pendente ? 'Gerando…' : atualizando ? 'Atualizar proposta comercial' : 'Gerar proposta comercial'}
        </Button>
      </div>
    </div>
  )
}
