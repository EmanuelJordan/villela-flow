'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

// Par categórico validado (dataviz: lightness band, chroma, CVD ΔE 22.7, contraste ≥3:1)
const config = {
  agendamentos: { label: 'Agendamentos', color: '#0090c0' },
  fechamentos: { label: 'Fechamentos', color: '#1259a8' },
} satisfies ChartConfig

export function GraficoAtividade({
  dados,
}: {
  dados: { dia: string; agendamentos: number; fechamentos: number }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Atividade no período</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-56 w-full">
          <AreaChart data={dados} margin={{ top: 8, right: 8 }}>
            <defs>
              <linearGradient id="fill-agendamentos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-agendamentos)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--color-agendamentos)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fill-fechamentos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-fechamentos)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--color-fechamentos)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="agendamentos"
              stroke="var(--color-agendamentos)"
              strokeWidth={2}
              fill="url(#fill-agendamentos)"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="fechamentos"
              stroke="var(--color-fechamentos)"
              strokeWidth={2}
              fill="url(#fill-fechamentos)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function GraficoFunil({ dados }: { dados: { nome: string; cor: string | null; qtd: number }[] }) {
  const max = Math.max(1, ...dados.map((d) => d.qtd))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leads por estágio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {dados.map((d) => (
          <div key={d.nome} className="flex items-center gap-2 text-sm">
            <span className="w-28 shrink-0 truncate text-muted-foreground">{d.nome}</span>
            <div className="h-4 flex-1 rounded-sm bg-muted">
              <div
                className="h-4 rounded-sm"
                style={{ width: `${Math.max(3, (d.qtd / max) * 100)}%`, background: d.cor ?? '#3CB5C9' }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-medium tabular-nums">{d.qtd}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
