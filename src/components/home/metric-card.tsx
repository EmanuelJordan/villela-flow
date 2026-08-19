import { Card, CardContent } from '@/components/ui/card'

export function MetricCard({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string
  valor: string
  detalhe?: string
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-[0.7rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {rotulo}
        </p>
        <p className="font-display mt-2 text-[1.9rem] leading-none font-semibold tracking-tight tabular-nums">
          {valor}
        </p>
        {detalhe && <p className="mt-2 text-xs text-muted-foreground">{detalhe}</p>}
      </CardContent>
    </Card>
  )
}
