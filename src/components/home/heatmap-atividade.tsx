import { addDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MatrizAtividade } from '@/lib/atividade'

// rampa sequencial de um matiz só (claro → escuro), magnitude = intensidade
const NIVEIS = ['#edf1ec', '#d3f0f9', '#7fd6ee', '#00bce5', '#116780']

function nivel(qtd: number, max: number): string {
  if (qtd === 0 || max === 0) return NIVEIS[0]
  const razao = qtd / max
  if (razao <= 0.25) return NIVEIS[1]
  if (razao <= 0.5) return NIVEIS[2]
  if (razao <= 0.75) return NIVEIS[3]
  return NIVEIS[4]
}

const ROTULOS_DIAS = ['seg', '', 'qua', '', 'sex', '', '']

/** Ritmo de trabalho das últimas 8 semanas — células por dia, estilo calendário. */
export function HeatmapAtividade({ dados }: { dados: MatrizAtividade }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Ritmo de atividade · 8 semanas</CardTitle>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          menos
          {NIVEIS.map((c) => (
            <span key={c} aria-hidden className="size-2.5 rounded-[3px]" style={{ background: c }} />
          ))}
          mais
        </span>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1">
          <div className="grid grid-rows-7 gap-1 pr-1.5 text-[10px] leading-none text-muted-foreground">
            {ROTULOS_DIAS.map((d, i) => (
              <span key={i} className="flex h-4 items-center">
                {d}
              </span>
            ))}
          </div>
          {dados.semanas.map((semana) => (
            <div key={semana.inicio.toISOString()} className="grid flex-1 grid-rows-7 gap-1">
              {semana.dias.map((qtd, dia) => (
                <div
                  key={dia}
                  title={`${qtd} ${qtd === 1 ? 'atividade' : 'atividades'} — ${format(
                    addDays(semana.inicio, dia),
                    'EEEEEE dd/MM',
                    { locale: ptBR },
                  )}`}
                  className="h-4 rounded-[3px]"
                  style={{ background: nivel(qtd, dados.max) }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between pl-7 text-[10px] text-muted-foreground">
          <span>{format(dados.semanas[0].inicio, "dd 'de' MMMM", { locale: ptBR })}</span>
          <span>semana atual</span>
        </div>
      </CardContent>
    </Card>
  )
}
