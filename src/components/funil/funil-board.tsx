'use client'

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { moverCardFunil } from '@/actions/propostas'
import { agruparEmBlocos } from '@/lib/funil-unificado/montar'
import {
  ETAPAS,
  type Bloco,
  type BlocoFunil,
  type CardFunil,
  type Etapa,
} from '@/lib/funil-unificado/tipos'
import { avaliarTransicao } from '@/lib/funil-unificado/transicoes'
import type { Periodo } from '@/lib/periodo'
import { cn } from '@/lib/utils'
import { CardDrawer } from './card-drawer'
import { FunilColuna } from './funil-coluna'
import { FunilCard } from './funil-card'
import { FunilFiltros } from './funil-filtros'
import { RegistrarPagamentoDialog } from './registrar-pagamento-dialog'
import { RegistrarPropostaDialog } from './registrar-proposta-dialog'

const ETAPA_VALIDA = (v: string): v is Etapa => v in ETAPAS

/** Lente do quadro: todas as colunas ou só um bloco. Some as demais, não as apaga. */
type Grupo = 'todos' | Bloco

const GRUPOS: { id: Grupo; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'agenda', rotulo: 'Agendamento' },
  { id: 'propostas', rotulo: 'Proposta' },
  { id: 'contratos', rotulo: 'Contrato fechado' },
]

export function FunilBoard({
  blocos,
  periodo,
  busca,
  falhas = [],
}: {
  blocos: BlocoFunil[]
  periodo: Periodo
  busca: string
  /** Fontes que não responderam — o quadro avisa em vez de fingir coluna vazia. */
  falhas?: string[]
}) {
  const router = useRouter()
  const [estado, setEstado] = useState(blocos)
  const [grupo, setGrupo] = useState<Grupo>('todos')
  const [arrastando, setArrastando] = useState<CardFunil | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [pedindoProposta, setPedindoProposta] = useState<{ card: CardFunil; destino: Etapa } | null>(null)
  const [pedindoPagamento, setPedindoPagamento] = useState<CardFunil | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  // sync de props → estado em fase de render (padrão derived state, sem effect)
  const [prevBlocos, setPrevBlocos] = useState(blocos)
  if (blocos !== prevBlocos) {
    setPrevBlocos(blocos)
    setEstado(blocos)
  }

  const todos = estado.flatMap((b) => b.colunas.flatMap((c) => c.cards))
  const cardAberto = todos.find((c) => c.id === aberto) ?? null

  // colunas lado a lado numa fila só; o grupo apenas esconde as de fora do filtro
  const colunas = estado
    .filter((b) => grupo === 'todos' || b.id === grupo)
    .flatMap((b) => b.colunas)

  /** Reprojeta o quadro a partir dos cards — as somas e contagens vêm juntas. */
  function reagrupar(cards: CardFunil[]) {
    setEstado(agruparEmBlocos(cards))
  }

  function onDragStart(e: DragStartEvent) {
    setArrastando(todos.find((c) => c.id === e.active.id) ?? null)
  }

  async function onDragEnd(e: DragEndEvent) {
    setArrastando(null)
    const destino = e.over ? String(e.over.id) : null
    if (!destino || !ETAPA_VALIDA(destino)) return

    const card = todos.find((c) => c.id === String(e.active.id))
    if (!card || card.etapa === destino) return

    const transicao = avaliarTransicao(card.etapa, destino)
    if (transicao.tipo === 'bloqueada') return toast.error(transicao.motivo)
    if (transicao.tipo === 'pede-proposta') return setPedindoProposta({ card, destino })
    if (transicao.tipo === 'pede-pagamento') return setPedindoPagamento(card)

    // otimista: move só este card e recalcula os totais em cima do resultado
    const anterior = card.etapa
    reagrupar(
      todos.map((c) => (c.id === card.id ? { ...c, etapa: destino, bloco: ETAPAS[destino].bloco } : c)),
    )

    const r = await moverCardFunil({ agendamentoId: card.id, para: destino })
    if (!r.ok) {
      // rollback funcional: devolve só o card movido, preservando drags concorrentes
      setEstado((atual) =>
        agruparEmBlocos(
          atual
            .flatMap((b) => b.colunas.flatMap((c) => c.cards))
            .map((c) => (c.id === card.id ? { ...c, etapa: anterior, bloco: ETAPAS[anterior].bloco } : c)),
        ),
      )
      toast.error(r.erro)
      return
    }
    // o servidor recalcula valorCard e datas — o otimista só acertou a coluna
    router.refresh()
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Funil</h1>
        <FunilFiltros periodo={periodo} busca={busca} />
      </div>

      {falhas.length > 0 && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm"
        >
          <span className="font-medium">Quadro incompleto.</span> Não foi possível carregar{' '}
          {falhas.join(' e ')} — as colunas correspondentes estão vazias por falha de leitura, não
          por não haver dado. Verifique se as migrations do funil (até{' '}
          <code>0005_proposta_comercial</code>) foram aplicadas.
        </div>
      )}

      <div
        role="tablist"
        aria-label="Filtrar colunas do funil"
        className="mb-4 inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-1"
      >
        {GRUPOS.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={grupo === g.id}
            onClick={() => setGrupo(g.id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              grupo === g.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {g.rotulo}
          </button>
        ))}
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {colunas.map((coluna) => (
            <FunilColuna
              key={coluna.etapa}
              coluna={coluna}
              onAbrir={setAberto}
              // o botão do card abre o assistente completo; o dialog rápido
              // continua atendendo só o arrasto efetiva → proposta
              onCriarProposta={(card) => router.push(`/funil/proposta/${card.id}`)}
            />
          ))}
        </div>
        <DragOverlay>{arrastando ? <FunilCard card={arrastando} overlay /> : null}</DragOverlay>
      </DndContext>

      <RegistrarPropostaDialog
        card={pedindoProposta?.card ?? null}
        destino={pedindoProposta?.destino ?? 'proposta_sem_esp'}
        onFechar={() => setPedindoProposta(null)}
        onSucesso={() => {
          setPedindoProposta(null)
          router.refresh()
        }}
      />
      <RegistrarPagamentoDialog
        card={pedindoPagamento}
        onFechar={() => setPedindoPagamento(null)}
        onSucesso={() => {
          setPedindoPagamento(null)
          router.refresh()
        }}
      />
      <CardDrawer
        card={cardAberto}
        onFechar={() => setAberto(null)}
        onMudou={() => router.refresh()}
      />
    </>
  )
}
