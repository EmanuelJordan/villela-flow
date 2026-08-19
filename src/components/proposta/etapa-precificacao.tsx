'use client'

import { format, parseISO } from 'date-fns'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { calcularParcela, calcularValidade, VALIDADES_DIAS } from '@/lib/proposta-comercial/calculos'
import { sugerirPreco } from '@/lib/proposta-comercial/sugestao-preco'
import type { PropostaComercialForm } from '@/lib/proposta-comercial/tipos'
import { cn, formatBRL } from '@/lib/utils'
import { CampoMoeda, Secao } from './campo'

const TITULOS_SUGERIDOS = [
  'Disponibilização de Garantia Real',
  'Transação Tributária',
  'Defesa Administrativa e Judicial',
  'Parcelamento Estratégico',
]

const PARCELAS_RECOMENDADAS = 6

const n = (v: string) => {
  const x = Number(v)
  return v !== '' && Number.isFinite(x) ? x : 0
}

export function EtapaPrecificacao({
  form,
  onPrecificacao,
  onVoltar,
  onSalvar,
}: {
  form: PropostaComercialForm
  onPrecificacao: (p: Partial<PropostaComercialForm['precificacao']>) => void
  onVoltar: () => void
  onSalvar: () => void
}) {
  const [sugestaoOculta, setSugestaoOculta] = useState(false)
  const p = form.precificacao

  const capital = n(form.diagnostico.capitalRecuperavel)
  const sugestao = sugerirPreco(capital || null, n(form.valorTotalDivida) || null)
  const parcela = calcularParcela(n(p.valorEstrategia), n(p.qtdParcelas), p.temEntrada ? n(p.valorEntrada) : 0)
  const validaAte = calcularValidade(p.validadeDias)

  return (
    <div className="space-y-4">
      <Secao titulo="Estratégia principal">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pc-titulo">Título da estratégia *</Label>
            <Input
              id="pc-titulo"
              list="pc-titulos-sugeridos"
              value={p.tituloEstrategia}
              onChange={(e) => onPrecificacao({ tituloEstrategia: e.target.value })}
              placeholder="Digite ou selecione um título…"
            />
            <datalist id="pc-titulos-sugeridos">
              {TITULOS_SUGERIDOS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <CampoMoeda
            id="pc-valor-estrategia"
            rotulo="Valor total da estratégia *"
            valor={p.valorEstrategia}
            onValor={(v) => onPrecificacao({ valorEstrategia: v })}
          />

          {sugestao && !sugestaoOculta && (
            <div className="rounded-lg border border-[var(--villela-teal)]/40 bg-accent/40 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="size-4 text-[var(--villela-teal)]" />
                Sugestão de preço
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {sugestao.base === 'capital_recuperavel' ? (
                  <>
                    Com um capital recuperável de{' '}
                    <span className="font-medium text-foreground">{formatBRL(capital)}</span>, o valor
                    sugerido para este contrato é:
                  </>
                ) : (
                  <>Com base na dívida total informada, o valor sugerido para este contrato é:</>
                )}
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-[color:var(--villela-teal-escuro)]">
                {formatBRL(sugestao.valor)}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                💡 Inicie a negociação com no máximo {PARCELAS_RECOMENDADAS} parcelas — o volume de
                parcelas é a sua primeira rodada de negociação.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onPrecificacao({ valorEstrategia: String(sugestao.valor) })}
                >
                  Aplicar sugestão
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSugestaoOculta(true)}>
                  Ignorar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="pc-descricao">Descrição da estratégia</Label>
            <Textarea
              id="pc-descricao"
              rows={3}
              value={p.descricaoEstrategia}
              onChange={(e) => onPrecificacao({ descricaoEstrategia: e.target.value })}
              placeholder="Ex.: disponibilização de garantia real no processo judicial para suspender bloqueios, penhoras e constrições patrimoniais, permitindo a regularização e continuidade da operação da empresa."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pc-parcelas">Quantidade de parcelas</Label>
              <Input
                id="pc-parcelas"
                type="number"
                min={1}
                max={36}
                step={1}
                value={p.qtdParcelas}
                onChange={(e) => onPrecificacao({ qtdParcelas: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Recomendado: até {PARCELAS_RECOMENDADAS}x.</p>
            </div>
            <div className="space-y-1.5">
              {/* não é <Label>: o valor ao lado é texto calculado, não um controle */}
              <p className="text-sm font-medium leading-none">Valor da parcela</p>
              <p className="flex h-8 items-center rounded-lg border border-input bg-muted/50 px-2.5 font-display text-sm font-semibold">
                {parcela > 0 ? formatBRL(parcela) : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Calculado automaticamente.</p>
            </div>
          </div>
        </div>
      </Secao>

      <Secao
        titulo="Entrada (opcional)"
        acao={
          <Switch
            checked={p.temEntrada}
            onCheckedChange={(v) => onPrecificacao({ temEntrada: v })}
            aria-label="Esta estratégia possui entrada?"
          />
        }
      >
        {p.temEntrada ? (
          <CampoMoeda
            id="pc-entrada"
            rotulo="Valor da entrada"
            valor={p.valorEntrada}
            onValor={(v) => onPrecificacao({ valorEntrada: v })}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Sem entrada — o total é dividido nas parcelas.</p>
        )}
      </Secao>

      <Secao titulo="Validade da proposta">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Válida por:</span>
          {VALIDADES_DIAS.map((dias) => (
            <button
              key={dias}
              type="button"
              onClick={() => onPrecificacao({ validadeDias: dias })}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                p.validadeDias === dias
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {dias} {dias === 1 ? 'dia' : 'dias'}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 text-center sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Data de emissão</p>
            <p className="font-display text-base font-bold">{format(new Date(), 'dd/MM/yyyy')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Válida até</p>
            <p className="font-display text-base font-bold text-[color:#16a34a]">
              {format(parseISO(validaAte), 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Esta proposta é válida por {p.validadeDias} {p.validadeDias === 1 ? 'dia corrido' : 'dias corridos'}{' '}
          a partir da data de emissão.
        </p>
      </Secao>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onVoltar}>
          Voltar
        </Button>
        <Button type="button" size="lg" onClick={onSalvar}>
          Salvar precificação
        </Button>
      </div>
    </div>
  )
}
