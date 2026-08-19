'use client'

import { useDraggable } from '@dnd-kit/core'
import { format, parseISO } from 'date-fns'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { CardFunil } from '@/lib/funil-unificado/tipos'
import { cn, formatBRL } from '@/lib/utils'

function iniciais(nome: string | null) {
  if (!nome) return '?'
  return nome
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * A linha do meio muda conforme a coluna: em Agendados o que importa é *quando*,
 * em Proposta é *quanto foi abatido*, em Contrato pago é *o que entrou*. Mostrar
 * tudo em todo lugar é o que deixa o quadro ilegível.
 */
function LinhaDoMeio({ card }: { card: CardFunil }) {
  if (card.etapa === 'agendado') {
    return (
      <span className="font-display text-sm font-semibold">
        {format(new Date(card.reuniaoEm), "dd/MM 'às' HH:mm")}
      </span>
    )
  }

  if (card.etapa === 'contrato_pago' && card.pagamento) {
    return (
      <span className="font-display text-sm font-semibold text-[color:var(--villela-ok,#16a34a)]">
        {formatBRL(card.pagamento.valorPago)}
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
          {format(parseISO(card.pagamento.dataPagamento), 'dd/MM')}
        </span>
      </span>
    )
  }

  if (card.proposta && card.bloco !== 'agenda') {
    return (
      <span className="font-display text-sm font-semibold">
        {formatBRL(card.proposta.valorEstrategia)}
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
          −{card.proposta.reducaoPercentual}%
        </span>
      </span>
    )
  }

  return <span className="font-display text-sm font-semibold">{formatBRL(card.valorDivida)}</span>
}

export function FunilCard({
  card,
  overlay = false,
  onAbrir,
  onCriarProposta,
}: {
  card: CardFunil
  overlay?: boolean
  onAbrir?: (id: string) => void
  onCriarProposta?: (card: CardFunil) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id })

  // Reunião efetiva ainda sem proposta é o único ponto em que a proposta nasce por
  // botão — ele leva ao assistente de montar proposta.
  const podeCriarProposta = card.etapa === 'efetiva' && !card.proposta && !overlay && !!onCriarProposta

  return (
    // <div> e não <button>: precisa aninhar o botão "Criar proposta" — botão dentro
    // de botão é HTML inválido. O card continua arrastável e abre a gaveta no clique.
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : { ...listeners, ...attributes })}
      onClick={() => onAbrir?.(card.id)}
      onKeyDown={(e) => {
        if (!overlay && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onAbrir?.(card.id)
        }
      }}
      role="button"
      tabIndex={overlay ? -1 : 0}
      className={cn(
        'w-full cursor-grab rounded-md border border-border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging && !overlay && 'opacity-40',
        overlay && 'rotate-2 shadow-lg',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{card.empresa}</p>
        {card.urgente && (
          <Badge variant="destructive" className="shrink-0">
            {card.diasParaVencer !== null && card.diasParaVencer < 0
              ? 'Vencida'
              : card.diasParaVencer === 0
                ? 'Vence hoje'
                : `Vence em ${card.diasParaVencer}d`}
          </Badge>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <LinhaDoMeio card={card} />
        <Avatar className="size-5 shrink-0">
          <AvatarFallback className="bg-accent text-[10px] text-accent-foreground">
            {iniciais(card.responsavel)}
          </AvatarFallback>
        </Avatar>
      </div>

      {podeCriarProposta && (
        <button
          type="button"
          // trava o arrasto e o clique-abre-gaveta do card ao redor
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onCriarProposta?.(card)
          }}
          className="mt-2.5 w-full rounded-md bg-primary px-2 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Criar proposta
        </button>
      )}
    </div>
  )
}
