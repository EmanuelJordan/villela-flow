import { tz } from '@date-fns/tz'
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns'

export type Periodo = 'hoje' | 'semana' | '7d' | 'mes'

/** Fronteiras de dia/semana/mês no fuso do usuário, não no do servidor (UTC em produção). */
const SP = tz('America/Sao_Paulo')

/** Semana comercial começa na segunda — é assim no sistema que a equipe já usa. */
const SEMANA = { weekStartsOn: 1 as const, in: SP }

/**
 * Janela olhando para trás: termina *agora*. É o que métrica quer — faturamento
 * do mês é o que já entrou, não o que o mês inteiro comporta.
 */
export function rangeDoPeriodo(periodo: Periodo, agora: Date = new Date()) {
  const fim = agora
  const inicio =
    periodo === 'hoje'
      ? startOfDay(agora)
      : periodo === 'semana'
        ? startOfWeek(agora, SEMANA)
        : periodo === 'mes'
          ? startOfMonth(agora)
          : subDays(agora, 7)
  return { inicio, fim }
}

/**
 * Janela do período inteiro, incluindo o que ainda não aconteceu. O funil precisa
 * disso: uma reunião marcada para sexta é trabalho *desta semana* e tem que
 * aparecer hoje. Por isso não dá para reaproveitar `rangeDoPeriodo`.
 */
export function janelaDoPeriodo(periodo: Periodo, agora: Date = new Date()) {
  switch (periodo) {
    case 'hoje':
      return { inicio: startOfDay(agora, { in: SP }), fim: endOfDay(agora, { in: SP }) }
    case 'semana':
      return { inicio: startOfWeek(agora, SEMANA), fim: endOfWeek(agora, SEMANA) }
    case '7d':
      return { inicio: startOfDay(subDays(agora, 7), { in: SP }), fim: endOfDay(agora, { in: SP }) }
    case 'mes':
      return { inicio: startOfMonth(agora, { in: SP }), fim: endOfMonth(agora, { in: SP }) }
  }
}
