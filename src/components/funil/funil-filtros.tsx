'use client'

import { Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import type { Periodo } from '@/lib/periodo'
import { cn } from '@/lib/utils'

const PERIODOS: { valor: Periodo; rotulo: string }[] = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: 'semana', rotulo: 'Semana' },
  { valor: 'mes', rotulo: 'Este mês' },
]

export function FunilFiltros({ periodo, busca }: { periodo: Periodo; busca: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [texto, setTexto] = useState(busca)
  const [pendente, startTransition] = useTransition()

  function navegar(mudanca: Record<string, string>) {
    const proximo = new URLSearchParams(params.toString())
    for (const [chave, valor] of Object.entries(mudanca)) {
      if (valor) proximo.set(chave, valor)
      else proximo.delete(chave)
    }
    startTransition(() => router.replace(`/funil?${proximo.toString()}`, { scroll: false }))
  }

  // digitar recarrega o servidor; sem espera o quadro pisca a cada tecla
  useEffect(() => {
    if (texto === busca) return
    const t = setTimeout(() => navegar({ q: texto.trim() }), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar empresa ou CNPJ"
          className="h-9 w-56 pl-8"
          aria-label="Buscar empresa ou CNPJ"
        />
      </div>
      <div
        className={cn(
          'flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5 transition-opacity',
          pendente && 'opacity-60',
        )}
      >
        {PERIODOS.map((opt) => (
          <button
            key={opt.valor}
            type="button"
            onClick={() => navegar({ periodo: opt.valor })}
            aria-pressed={periodo === opt.valor}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              periodo === opt.valor
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.rotulo}
          </button>
        ))}
      </div>
    </div>
  )
}
