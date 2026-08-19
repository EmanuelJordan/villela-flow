import { ETAPAS, type Etapa } from './tipos'

/**
 * O que acontece ao arrastar um card. Como a etapa é derivada, mover não grava
 * posição: grava a *causa* (status da reunião, proposta, contrato, pagamento).
 * Por isso nem todo movimento é possível — não dá para inventar uma proposta que
 * ninguém escreveu.
 */
export type Transicao =
  | { tipo: 'direta' }
  | { tipo: 'pede-proposta' }
  | { tipo: 'pede-pagamento' }
  | { tipo: 'bloqueada'; motivo: string }

export function avaliarTransicao(de: Etapa, para: Etapa): Transicao {
  if (de === para) return { tipo: 'direta' }

  const blocoDe = ETAPAS[de].bloco
  const blocoPara = ETAPAS[para].bloco

  if (blocoDe === blocoPara) {
    // Agenda e Propostas são só flags — ir e voltar é barato.
    if (blocoDe !== 'contratos') return { tipo: 'direta' }
    // Contratos não: cada lado é lastreado por um registro de pagamento.
    return para === 'contrato_pago'
      ? { tipo: 'pede-pagamento' }
      : { tipo: 'bloqueada', motivo: 'Estornar um pagamento não é pelo arrasto — use o painel do card.' }
  }

  if (blocoDe === 'agenda' && blocoPara === 'propostas') {
    return de === 'efetiva'
      ? { tipo: 'pede-proposta' }
      : {
          tipo: 'bloqueada',
          motivo: 'Só reunião efetiva vira proposta. Marque a reunião como efetiva antes.',
        }
  }

  if (blocoDe === 'propostas' && blocoPara === 'contratos') {
    return para === 'contrato_nao_pago'
      ? { tipo: 'direta' }
      : { tipo: 'bloqueada', motivo: 'Registre o contrato assinado antes de lançar o pagamento.' }
  }

  if (blocoDe === 'agenda' && blocoPara === 'contratos') {
    return { tipo: 'bloqueada', motivo: 'O card precisa passar por proposta antes de virar contrato.' }
  }

  return {
    tipo: 'bloqueada',
    motivo: 'Voltar de bloco apagaria proposta ou pagamento — desfaça pelo painel do card.',
  }
}
