import { differenceInCalendarDays } from 'date-fns'
import type { AgendamentoRow, Etapa, PagamentoRow, PropostaRow } from './tipos'

/**
 * Reunião que ninguém marcou vira "não efetiva" sozinha depois deste prazo. Na
 * prática a equipe não volta para carimbar "não compareceu": passou o tempo sem
 * virar proposta, é não efetiva. Contado a partir da data da reunião.
 */
export const DIAS_PARA_NAO_EFETIVA = 15

/**
 * Onde o card cai no quadro. Cascata: a primeira regra que casa vence, e a ordem
 * importa — pagamento manda mais que contrato, que manda mais que proposta, que
 * manda mais que o status da reunião.
 *
 * Deriva tudo dos dados de propósito: assim não existe card em "Contrato pago"
 * sem pagamento registrado, nem o inverso.
 *
 * Devolve `null` quando o card não pertence ao quadro.
 */
export function classificar(
  agendamento: Pick<AgendamentoRow, 'status' | 'inicio'>,
  proposta: Pick<PropostaRow, 'espelhamento' | 'enviada_em' | 'contrato_status'> | null,
  pagamento: Pick<PagamentoRow, 'id'> | null,
  agora: Date = new Date(),
): Etapa | null {
  if (pagamento) return 'contrato_pago'

  if (proposta) {
    if (proposta.contrato_status === 'enviado' || proposta.contrato_status === 'assinado') {
      return 'contrato_nao_pago'
    }
    if (proposta.enviada_em) {
      return proposta.espelhamento ? 'proposta_com_esp' : 'proposta_sem_esp'
    }
  }

  // Reunião cancelada sai do quadro — mas só aqui embaixo: se já virou proposta
  // ou contrato, o dinheiro na mesa vale mais que o status da agenda.
  if (agendamento.status === 'cancelado') return null

  if (agendamento.status === 'realizado') return 'efetiva'
  if (agendamento.status === 'nao_compareceu') return 'nao_efetiva'

  // Ninguém carimbou e a reunião já passou do prazo: cai para não efetiva sem
  // clique. Reunião no futuro (diferença negativa) segue agendada.
  if (differenceInCalendarDays(agora, new Date(agendamento.inicio)) > DIAS_PARA_NAO_EFETIVA) {
    return 'nao_efetiva'
  }
  return 'agendado'
}

/** Redução percentual da proposta, com guarda de divisão por zero. */
export function reducaoPercentual(valorTotalDivida: number, valorEstrategia: number): number {
  if (!(valorTotalDivida > 0)) return 0
  return Math.round(((valorTotalDivida - valorEstrategia) / valorTotalDivida) * 1000) / 10
}
