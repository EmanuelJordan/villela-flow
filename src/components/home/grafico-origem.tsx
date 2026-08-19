'use client'

import { Cell, Pie, PieChart } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

// Paleta categórica validada (dataviz validate_palette --mode light:
// lightness band, chroma, CVD ΔE≥20, contraste ≥3:1 — todos PASS).
// Cor segue a categoria (fixa por nome), nunca a posição no ranking.
const CORES: Record<string, string> = {
  Indicação: '#0090c0',
  Site: '#1259a8',
  'Prospecção ativa': '#0d9488',
  Parceiro: '#d97706',
}
const COR_OUTROS = '#64748b'

const cor = (origem: string) => CORES[origem] ?? COR_OUTROS

export function GraficoOrigem({ dados }: { dados: { origem: string; qtd: number }[] }) {
  const total = dados.reduce((soma, d) => soma + d.qtd, 0)
  const config = Object.fromEntries(
    dados.map((d) => [d.origem, { label: d.origem, color: cor(d.origem) }]),
  ) as ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Origem dos leads</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhum lead na carteira ainda.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="relative mx-auto">
              <ChartContainer config={config} className="aspect-square h-44">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="origem" hideLabel />} />
                  <Pie
                    data={dados}
                    dataKey="qtd"
                    nameKey="origem"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {dados.map((d) => (
                      <Cell key={d.origem} fill={cor(d.origem)} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-bold tabular-nums">{total}</span>
                <span className="text-xs text-muted-foreground">leads</span>
              </div>
            </div>
            <ul className="min-w-40 flex-1 space-y-2">
              {dados.map((d) => (
                <li key={d.origem} className="flex items-center gap-2 text-sm">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-[3px]"
                    style={{ background: cor(d.origem) }}
                  />
                  <span className="flex-1 truncate text-muted-foreground">{d.origem}</span>
                  <span className="font-medium tabular-nums">{d.qtd}</span>
                  <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {Math.round((d.qtd / total) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
