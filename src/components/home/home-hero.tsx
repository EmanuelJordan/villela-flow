import { tz } from '@date-fns/tz'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import type { Periodo } from '@/lib/periodo'
import { cn } from '@/lib/utils'

const SP = tz('America/Sao_Paulo')

const PERIODOS: { valor: Periodo; rotulo: string }[] = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: '7d', rotulo: '7 dias' },
  { valor: 'mes', rotulo: 'Este mês' },
]

function saudacaoDoDia(): string {
  const hora = Number(format(new Date(), 'H', { in: SP }))
  if (hora >= 5 && hora < 12) return 'Bom dia'
  if (hora >= 12 && hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

/**
 * Faixa de boas-vindas em navy institucional — mesma linguagem do painel do
 * login (textura diagonal + costura de fluxo na base). À direita, o número
 * que resume a operação (pipeline ativo) e o seletor de período.
 */
export function HomeHero({
  nome,
  contexto,
  resumo,
  destaque,
  periodo,
}: {
  nome: string
  contexto: string
  resumo?: string
  destaque: { rotulo: string; valor: string }
  periodo: Periodo
}) {
  const dataExtenso = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR, in: SP })
  return (
    <section className="relative overflow-hidden rounded-2xl bg-[var(--villela-navy)] text-white">
      {/* textura de marca (mesma do login) */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(90%_80%_at_80%_0%,rgb(17_103_128/0.5),transparent_65%)]" />
        <div className="absolute inset-0 opacity-[0.05] [background:repeating-linear-gradient(115deg,transparent_0_46px,#5bc8f5_46px_47px)]" />
      </div>

      <div className="relative flex flex-wrap items-end justify-between gap-x-8 gap-y-5 px-6 py-6 sm:px-8 sm:py-7">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-medium tracking-[0.2em] text-[#5bc8f5] uppercase">
            {dataExtenso} · {contexto}
          </p>
          <h1 className="font-display mt-2 text-[clamp(1.7rem,3vw,2.3rem)] leading-tight font-semibold tracking-tight">
            {saudacaoDoDia()}, {nome.split(' ')[0]}.
          </h1>
          {resumo && <p className="mt-1.5 max-w-xl text-sm text-white/70">{resumo}</p>}
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div className="text-right">
            <p className="text-[0.68rem] font-medium tracking-[0.18em] text-white/60 uppercase">
              {destaque.rotulo}
            </p>
            <p className="font-display mt-1 text-[2rem] leading-none font-bold tracking-tight tabular-nums">
              {destaque.valor}
            </p>
          </div>
          <div className="flex gap-1 rounded-lg bg-white/10 p-1">
            {PERIODOS.map((opt) => (
              <Link
                key={opt.valor}
                href={`/home?periodo=${opt.valor}`}
                className={cn(
                  'rounded-md px-3 py-1 text-sm transition-colors',
                  periodo === opt.valor
                    ? 'bg-white font-medium text-[var(--villela-navy)]'
                    : 'text-white/70 hover:text-white',
                )}
              >
                {opt.rotulo}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* costura de fluxo na base — assinatura que atravessa o produto */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#00bce5] to-transparent"
      />
    </section>
  )
}
