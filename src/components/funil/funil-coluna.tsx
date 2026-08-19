'use client'

import { useDroppable } from '@dnd-kit/core'
import type { CardFunil, ColunaFunil } from '@/lib/funil-unificado/tipos'
import { cn, formatBRLCompacto } from '@/lib/utils'
import { FunilCard } from './funil-card'

export function FunilColuna({
  coluna,
  onAbrir,
  onCriarProposta,
}: {
  coluna: ColunaFunil
  onAbrir?: (id: string) => void
  onCriarProposta?: (card: CardFunil) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.etapa })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/40',
        isOver && 'ring-2 ring-ring',
      )}
      // faixa fina no topo em vez de fundo colorido — a cor identifica sem gritar
      style={{ borderTop: `3px solid ${coluna.cor}` }}
    >
      <div className="border-b border-border/60 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: coluna.cor }}
            />
            <h3 className="truncate text-sm font-semibold">{coluna.nome}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {coluna.cards.length}
          </span>
        </div>
        {/* o somatório é o número que a equipe acompanha — vem grande, não no cantinho */}
        <p
          className={cn(
            'mt-1.5 font-display text-2xl font-bold tabular-nums',
            coluna.total > 0 ? 'text-foreground' : 'text-muted-foreground/40',
          )}
        >
          {formatBRLCompacto(coluna.total)}
        </p>
      </div>
      <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
        {coluna.cards.map((card) => (
          <FunilCard key={card.id} card={card} onAbrir={onAbrir} onCriarProposta={onCriarProposta} />
        ))}
        {coluna.cards.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground/70">Nenhum card</p>
        )}
      </div>
    </div>
  )
}
