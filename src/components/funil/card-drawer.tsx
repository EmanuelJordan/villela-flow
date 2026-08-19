'use client'

import { format, parseISO } from 'date-fns'
import { ExternalLink, Pencil } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { desfazerPagamento, desfazerProposta } from '@/actions/propostas'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ETAPAS, type CardFunil } from '@/lib/funil-unificado/tipos'
import { formatBRL, formatCpfCnpj } from '@/lib/utils'

function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="text-right font-medium">{valor}</span>
    </div>
  )
}

export function CardDrawer({
  card,
  onFechar,
  onMudou,
}: {
  card: CardFunil | null
  onFechar: () => void
  onMudou: () => void
}) {
  const [confirmando, setConfirmando] = useState<'proposta' | 'pagamento' | null>(null)
  const [pendente, startTransition] = useTransition()

  function desfazer(alvo: 'proposta' | 'pagamento') {
    if (!card?.proposta) return
    const propostaId = card.proposta.id
    startTransition(async () => {
      const r = alvo === 'proposta' ? await desfazerProposta(propostaId) : await desfazerPagamento(propostaId)
      if (!r.ok) {
        toast.error(r.erro)
        return
      }
      toast.success(alvo === 'proposta' ? 'Proposta removida.' : 'Pagamento desfeito.')
      setConfirmando(null)
      onMudou()
      onFechar()
    })
  }

  return (
    <Sheet open={card !== null} onOpenChange={(v) => !v && onFechar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {card && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-6 leading-tight">{card.empresa}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" style={{ borderColor: ETAPAS[card.etapa].cor }}>
                  {ETAPAS[card.etapa].nome}
                </Badge>
                {card.cpfCnpj && <span>{formatCpfCnpj(card.cpfCnpj)}</span>}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-6">
              <div className="space-y-2">
                <Linha
                  rotulo="Reunião"
                  valor={format(new Date(card.reuniaoEm), "dd/MM/yyyy 'às' HH:mm")}
                />
                <Linha rotulo="Responsável" valor={card.responsavel ?? '—'} />
                <Linha rotulo="Dívida" valor={formatBRL(card.valorDivida)} />
              </div>

              {card.proposta && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Proposta
                    </h3>
                    <Linha rotulo="Dívida na proposta" valor={formatBRL(card.proposta.valorTotalDivida)} />
                    <Linha rotulo="Valor da estratégia" valor={formatBRL(card.proposta.valorEstrategia)} />
                    <Linha
                      rotulo="Redução"
                      valor={`${formatBRL(card.proposta.valorTotalDivida - card.proposta.valorEstrategia)} · ${card.proposta.reducaoPercentual}%`}
                    />
                    <Linha
                      rotulo="Espelhamento"
                      valor={card.proposta.espelhamento ? 'Com jurídico' : 'Sem espelhamento'}
                    />
                    {card.proposta.dataValidade && (
                      <Linha
                        rotulo="Validade"
                        valor={
                          <>
                            {format(parseISO(card.proposta.dataValidade), 'dd/MM/yyyy')}
                            {card.diasParaVencer !== null && (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                {card.diasParaVencer < 0
                                  ? `venceu há ${Math.abs(card.diasParaVencer)}d`
                                  : card.diasParaVencer === 0
                                    ? 'vence hoje'
                                    : `em ${card.diasParaVencer}d`}
                              </span>
                            )}
                          </>
                        }
                      />
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {card.proposta.tokenPublico && (
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={`/proposta/${card.proposta.tokenPublico}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="size-3.5" /> Abrir apresentação
                          </a>
                        </Button>
                      )}
                      {card.bloco === 'propostas' && (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/funil/proposta/${card.id}`}>
                            <Pencil className="size-3.5" /> Editar proposta
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {card.pagamento && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Pagamento
                    </h3>
                    <Linha rotulo="Valor pago" valor={formatBRL(card.pagamento.valorPago)} />
                    <Linha
                      rotulo="Data"
                      valor={format(parseISO(card.pagamento.dataPagamento), 'dd/MM/yyyy')}
                    />
                    {card.pagamento.metodo && <Linha rotulo="Método" valor={card.pagamento.metodo} />}
                  </div>
                </>
              )}

              {card.proposta && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Desfazer
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Arrastar de volta apagaria registro sem aviso, então o caminho é aqui.
                    </p>
                    {confirmando ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium">
                          {confirmando === 'pagamento'
                            ? 'O card volta para Contratos não pagos.'
                            : card.pagamento
                              ? 'Isto apaga a proposta E o pagamento registrado. O card volta para Efetivas.'
                              : 'O card volta para Efetivas.'}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={pendente}
                            onClick={() => desfazer(confirmando)}
                          >
                            {pendente ? 'Desfazendo…' : 'Confirmar'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmando(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {card.pagamento && (
                          <Button size="sm" variant="outline" onClick={() => setConfirmando('pagamento')}>
                            Desfazer pagamento
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setConfirmando('proposta')}>
                          Remover proposta
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
