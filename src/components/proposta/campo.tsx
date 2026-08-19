'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const moedaBR = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Campo monetário no padrão brasileiro: os dígitos entram como centavos e o
 *  valor aparece sempre formatado (18.966,99), como em app de banco. Guarda no
 *  formulário o número cru em string ("18966.99"), que o schema converte. */
export function CampoMoeda({
  id,
  rotulo,
  valor,
  onValor,
  sufixo,
  className,
}: {
  id: string
  rotulo: string
  valor: string
  onValor: (v: string) => void
  sufixo?: React.ReactNode
  className?: string
}) {
  const n = Number(valor)
  const cents = valor !== '' && Number.isFinite(n) ? Math.round(n * 100) : null
  const display = cents != null ? moedaBR.format(cents / 100) : ''

  function aoDigitar(bruto: string) {
    const digitos = bruto.replace(/\D/g, '')
    if (!digitos) return onValor('')
    onValor(String(parseInt(digitos, 10) / 100))
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            R$
          </span>
          <Input
            id={id}
            inputMode="decimal"
            value={display}
            placeholder="0,00"
            onChange={(e) => aoDigitar(e.target.value)}
            className={`pl-9 text-right ${className ?? ''}`}
          />
        </div>
        {sufixo}
      </div>
    </div>
  )
}

/** Par rótulo + input controlado — o assistente repete isto à exaustão. */
export function Campo({
  id,
  rotulo,
  valor,
  onValor,
  tipo = 'text',
  placeholder,
  sufixo,
}: {
  id: string
  rotulo: string
  valor: string
  onValor: (v: string) => void
  tipo?: 'text' | 'number' | 'tel'
  placeholder?: string
  /** Botão/adorno colado à direita do input (ex.: copiar CNPJ). */
  sufixo?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type={tipo}
          {...(tipo === 'number' ? { min: 0, step: '0.01' } : {})}
          value={valor}
          placeholder={placeholder}
          onChange={(e) => onValor(e.target.value)}
        />
        {sufixo}
      </div>
    </div>
  )
}

/** Cartão de seção do assistente e da apresentação — título pequeno em caps. */
export function Secao({
  titulo,
  acao,
  children,
  className,
}: {
  titulo: string
  acao?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-border bg-card p-5 ${className ?? ''}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  )
}
