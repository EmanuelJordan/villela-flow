import { projetarDivida } from './calculos'
import type { PropostaComercialForm } from './tipos'

/** Leitura defensiva do `diagnostico_dados` (jsonb livre gravado pelo parser de
 *  diagnóstico — shape `DiagnosticoExtraido`). Nada aqui pode explodir com dado
 *  malformado: campo estranho vira campo vazio no formulário. */
type Json = Record<string, unknown>
const obj = (v: unknown): Json | undefined =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : undefined
const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined
const txt = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined

// arredonda a 2 casas: o diagnóstico traz capital com 4 decimais (18966,9996)
// e o formulário é monetário — guardar centavos, não a fração crua
const s = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? '' : String(Math.round(v * 100) / 100)

export interface EntradaPrefill {
  agendamento: {
    titulo: string
    inicio: string
    empresa: string | null
    cpf_cnpj: string | null
    valor_divida: number | null
    diagnostico_dados: unknown
  }
  lead: {
    nome_cliente: string
    empresa: string | null
    cpf_cnpj: string | null
    telefone: string | null
    valor_divida: number | null
    diagnostico_dados: unknown
  } | null
  nomeFranqueado: string
}

/** Redução prevista quando não dá para derivar do diagnóstico — chute neutro
 *  que o franqueado ajusta na tela (a referência trabalha em torno de 50%). */
export const REDUCAO_PADRAO_PCT = 50

/** Parcelas e validade que a etapa de precificação abre sugerindo. */
export const PARCELAS_PADRAO = 6
export const VALIDADE_PADRAO_DIAS = 5

/** Monta os defaults do assistente a partir do agendamento, do lead e do
 *  diagnóstico. Mesma precedência do card do funil: agendamento > lead >
 *  diagnóstico (o agendamento é o que o time revisou por último). */
export function montarPrefill({ agendamento, lead, nomeFranqueado }: EntradaPrefill): PropostaComercialForm {
  const diag = obj(agendamento.diagnostico_dados) ?? obj(lead?.diagnostico_dados) ?? {}
  const det = obj(diag.detalhes) ?? {}

  const capital = num(det.capitalRecuperavel) ?? null
  const divida = agendamento.valor_divida ?? lead?.valor_divida ?? num(diag.valorDivida) ?? null
  const reducaoPct =
    capital != null && divida != null && divida > 0
      ? Math.min(100, Math.max(0, Math.round((capital / divida) * 100)))
      : REDUCAO_PADRAO_PCT

  const dividaFiscal = num(det.dividaFiscal) ?? null
  // previsão "se nada for feito" pré-calculada da dívida; o franqueado ajusta
  const prev = projetarDivida(divida ?? 0)

  return {
    cliente: {
      nomeCliente: lead?.nome_cliente ?? txt(diag.nomeCliente) ?? '',
      empresa: agendamento.empresa ?? lead?.empresa ?? txt(diag.empresa) ?? '',
      cpfCnpj: agendamento.cpf_cnpj ?? lead?.cpf_cnpj ?? txt(diag.cpfCnpj) ?? '',
      dataReuniao: agendamento.inicio,
      franqueado: nomeFranqueado,
      whatsappCloser: '',
      telefoneEmpresa: '',
      telefoneWhatsapp: lead?.telefone ?? txt(diag.telefone) ?? '',
    },
    diagnostico: {
      score: s(num(det.score)),
      capitalRecuperavel: s(capital),
      dividaFiscal: s(dividaFiscal),
      dividaBancaria: s(num(det.dividaBancaria)),
      dividaTrabalhista: s(num(det.dividaTrabalhista)),
    },
    // a dívida PGFN é a fiscal federal — melhor palpite disponível no diagnóstico
    pgfn: { valorDivida: s(dividaFiscal), observacao: '' },
    valorTotalDivida: s(divida),
    reducaoPct: String(reducaoPct),
    previsao: {
      divida6m: s(prev?.divida6m ?? null),
      divida12m: s(prev?.divida12m ?? null),
    },
    precificacao: {
      tituloEstrategia: '',
      valorEstrategia: '',
      descricaoEstrategia: '',
      qtdParcelas: String(PARCELAS_PADRAO),
      temEntrada: false,
      valorEntrada: '',
      validadeDias: VALIDADE_PADRAO_DIAS,
    },
  }
}

export interface PropostaExistenteRow {
  valor_total_divida: number
  valor_estrategia: number
  titulo_estrategia: string | null
  descricao_estrategia: string | null
  qtd_parcelas: number
  valor_entrada: number | null
  capital_recuperavel: number | null
  apresentacao: unknown
}

/** Proposta já registrada reabre o assistente como edição: o snapshot congelado
 *  vence o prefill (foi o que o franqueado revisou), e o que ele não tiver — caso
 *  do dialog rápido, que grava só os valores — continua vindo do prefill. A
 *  validade não é reidratada de propósito: reprecificar renova o prazo. */
export function reidratarForm(base: PropostaComercialForm, proposta: PropostaExistenteRow): PropostaComercialForm {
  const snap = obj(proposta.apresentacao) ?? {}
  const cliente = obj(snap.cliente) ?? {}
  const diagnostico = obj(snap.diagnostico) ?? {}
  const pgfn = obj(snap.pgfn) ?? {}
  const simulacao = obj(snap.simulacao) ?? {}
  const previsao = obj(snap.previsao) ?? {}

  return {
    cliente: {
      nomeCliente: txt(cliente.nomeCliente) ?? base.cliente.nomeCliente,
      empresa: txt(cliente.empresa) ?? base.cliente.empresa,
      cpfCnpj: txt(cliente.cpfCnpj) ?? base.cliente.cpfCnpj,
      dataReuniao: txt(cliente.dataReuniao) ?? base.cliente.dataReuniao,
      franqueado: txt(cliente.franqueado) ?? base.cliente.franqueado,
      whatsappCloser: txt(cliente.whatsappCloser) ?? base.cliente.whatsappCloser,
      telefoneEmpresa: txt(cliente.telefoneEmpresa) ?? base.cliente.telefoneEmpresa,
      telefoneWhatsapp: txt(cliente.telefoneWhatsapp) ?? base.cliente.telefoneWhatsapp,
    },
    diagnostico: {
      score: s(num(diagnostico.score)) || base.diagnostico.score,
      capitalRecuperavel:
        s(proposta.capital_recuperavel ?? num(diagnostico.capitalRecuperavel)) ||
        base.diagnostico.capitalRecuperavel,
      dividaFiscal: s(num(diagnostico.dividaFiscal)) || base.diagnostico.dividaFiscal,
      dividaBancaria: s(num(diagnostico.dividaBancaria)) || base.diagnostico.dividaBancaria,
      dividaTrabalhista: s(num(diagnostico.dividaTrabalhista)) || base.diagnostico.dividaTrabalhista,
    },
    pgfn: {
      valorDivida: s(num(pgfn.valorDivida)) || base.pgfn.valorDivida,
      observacao: txt(pgfn.observacao) ?? base.pgfn.observacao,
    },
    valorTotalDivida: s(proposta.valor_total_divida),
    reducaoPct: s(num(simulacao.reducaoPct)) || base.reducaoPct,
    previsao: {
      divida6m: s(num(previsao.divida6m)) || base.previsao.divida6m,
      divida12m: s(num(previsao.divida12m)) || base.previsao.divida12m,
    },
    precificacao: {
      tituloEstrategia: proposta.titulo_estrategia ?? '',
      valorEstrategia: s(proposta.valor_estrategia),
      descricaoEstrategia: proposta.descricao_estrategia ?? '',
      qtdParcelas: s(proposta.qtd_parcelas) || base.precificacao.qtdParcelas,
      temEntrada: proposta.valor_entrada != null && proposta.valor_entrada > 0,
      valorEntrada: proposta.valor_entrada != null && proposta.valor_entrada > 0 ? s(proposta.valor_entrada) : '',
      validadeDias: base.precificacao.validadeDias,
    },
  }
}
