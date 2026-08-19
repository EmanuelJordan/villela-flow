import { addWeeks, differenceInCalendarWeeks, getDay, startOfWeek, subWeeks } from 'date-fns'

export type MatrizAtividade = {
  /** semanas em ordem cronológica (a última é a atual); dias[0] = segunda */
  semanas: { inicio: Date; dias: number[] }[]
  max: number
}

/**
 * Grade de atividade estilo calendário (heatmap): conta ocorrências por dia
 * nas últimas `numSemanas` semanas (semana começa na segunda-feira).
 */
export function matrizAtividade(
  datas: (string | Date)[],
  agora: Date = new Date(),
  numSemanas = 8,
): MatrizAtividade {
  const semanaAtual = startOfWeek(agora, { weekStartsOn: 1 })
  const inicioJanela = subWeeks(semanaAtual, numSemanas - 1)
  const fimJanela = addWeeks(semanaAtual, 1)

  const semanas = Array.from({ length: numSemanas }, (_, i) => ({
    inicio: addWeeks(inicioJanela, i),
    dias: Array<number>(7).fill(0),
  }))

  for (const data of datas) {
    const d = data instanceof Date ? data : new Date(data)
    if (d < inicioJanela || d >= fimJanela) continue
    const semana = differenceInCalendarWeeks(d, inicioJanela, { weekStartsOn: 1 })
    const dia = (getDay(d) + 6) % 7 // seg=0 … dom=6
    semanas[semana].dias[dia]++
  }

  const max = Math.max(0, ...semanas.flatMap((s) => s.dias))
  return { semanas, max }
}
