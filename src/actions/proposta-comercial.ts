'use server'

import { revalidatePath } from 'next/cache'
import { escopoDoPapel } from '@/lib/escopo'
import { estadoDoCard } from '@/lib/funil-unificado/estado-card'
import { calcularValidade, projetarDivida, simularReducao } from '@/lib/proposta-comercial/calculos'
import { gerarTokenProposta } from '@/lib/proposta-comercial/token'
import {
  propostaComercialSchema,
  type ApresentacaoProposta,
  type PropostaComercialInput,
} from '@/lib/validators/proposta-comercial'
import type { Json } from '@/types/database'
import { requireContexto } from './_contexto'

function revalidar() {
  revalidatePath('/funil')
  revalidatePath('/agendamento')
  revalidatePath('/home')
}

const limpar = (v: string | undefined) => (v ? v : undefined)

/**
 * Cria (ou reprecifica) a proposta comercial e congela o snapshot da
 * apresentação pública. A mesma linha continua alimentando o funil: com
 * `enviada_em` setado o card cai na coluna Propostas, como sempre.
 */
export async function gerarPropostaComercial(input: PropostaComercialInput) {
  const parsed = propostaComercialSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, erro: parsed.error.issues[0].message }
  const { supabase, profile, user } = await requireContexto()
  const dados = parsed.data

  const estado = await estadoDoCard(supabase, dados.agendamento_id, escopoDoPapel(profile))
  if (!estado?.etapa) return { ok: false as const, erro: 'Card não encontrado.' }
  if (!estado.proposta && estado.etapa !== 'efetiva') {
    return { ok: false as const, erro: 'Só reunião efetiva vira proposta.' }
  }
  // com contrato fechado, reprecificar mudaria o valor de um negócio já batido
  if (estado.proposta && (estado.etapa === 'contrato_nao_pago' || estado.etapa === 'contrato_pago')) {
    return { ok: false as const, erro: 'O contrato já foi fechado — desfaça no painel do card antes de alterar a proposta.' }
  }

  // previsão da dívida sem ação: usa os valores editados; onde faltar, cai no
  // cálculo padrão (+15% / +32% da dívida). O aumento deriva da dívida original.
  const proj = projetarDivida(dados.valorTotalDivida)
  const divida6m = dados.previsao.divida6m ?? proj?.divida6m
  const divida12m = dados.previsao.divida12m ?? proj?.divida12m
  const aumento = (projetada: number | undefined) =>
    projetada != null ? Math.max(0, Math.round((projetada - dados.valorTotalDivida) * 100) / 100) : undefined

  // tudo aqui é montado no servidor a partir do input validado; nada de objeto
  // extra vindo do cliente entra no snapshot
  const apresentacao: ApresentacaoProposta = {
    versao: 2,
    especialista: {
      nome: limpar(dados.cliente.franqueado),
      email: limpar(user.email ?? undefined),
      telefone: limpar(dados.cliente.whatsappCloser),
    },
    previsao: {
      divida6m,
      aumento6m: aumento(divida6m),
      divida12m,
      aumento12m: aumento(divida12m),
    },
    cliente: {
      nomeCliente: limpar(dados.cliente.nomeCliente),
      empresa: limpar(dados.cliente.empresa),
      cpfCnpj: limpar(dados.cliente.cpfCnpj),
      dataReuniao: limpar(dados.cliente.dataReuniao),
      franqueado: limpar(dados.cliente.franqueado),
      whatsappCloser: limpar(dados.cliente.whatsappCloser),
      telefoneEmpresa: limpar(dados.cliente.telefoneEmpresa),
      telefoneWhatsapp: limpar(dados.cliente.telefoneWhatsapp),
    },
    diagnostico: {
      score: dados.diagnostico.score,
      capitalRecuperavel: dados.diagnostico.capitalRecuperavel,
      dividaFiscal: dados.diagnostico.dividaFiscal,
      dividaBancaria: dados.diagnostico.dividaBancaria,
      dividaTrabalhista: dados.diagnostico.dividaTrabalhista,
    },
    pgfn: {
      valorDivida: dados.pgfn.valorDivida,
      observacao: limpar(dados.pgfn.observacao),
    },
    simulacao: {
      dividaOriginal: dados.valorTotalDivida,
      reducaoPct: dados.reducaoPct,
      ...simularReducao(dados.valorTotalDivida, dados.reducaoPct),
    },
  }

  const agoraIso = new Date().toISOString()
  const camposComuns = {
    valor_total_divida: dados.valorTotalDivida,
    valor_estrategia: dados.precificacao.valorEstrategia,
    data_validade: calcularValidade(dados.precificacao.validadeDias),
    titulo_estrategia: dados.precificacao.tituloEstrategia,
    descricao_estrategia: limpar(dados.precificacao.descricaoEstrategia) ?? null,
    qtd_parcelas: dados.precificacao.qtdParcelas,
    valor_entrada: dados.precificacao.valorEntrada ?? null,
    capital_recuperavel: dados.diagnostico.capitalRecuperavel ?? null,
    apresentacao: apresentacao as Json,
    gerada_em: agoraIso,
  }

  const propostaExistente = estado.proposta
  const executar = (token: string) =>
    propostaExistente
      ? supabase
          .from('propostas')
          .update({ ...camposComuns, token_publico: token })
          .eq('id', propostaExistente.id)
      : supabase.from('propostas').insert({
          team_id: estado.agendamento.team_id,
          agendamento_id: dados.agendamento_id,
          lead_id: estado.agendamento.lead_id,
          owner_id: profile.id,
          espelhamento: false,
          enviada_em: agoraIso,
          token_publico: token,
          ...camposComuns,
        })

  // reprecificar preserva o token: a URL que o cliente recebeu continua valendo
  let token = propostaExistente?.token_publico ?? gerarTokenProposta()
  let { error } = await executar(token)
  // 192 bits não colidem na prática, mas tratar custa uma linha
  if (error?.code === '23505' && error.message.includes('token_publico')) {
    token = gerarTokenProposta()
    ;({ error } = await executar(token))
  }
  if (error) return { ok: false as const, erro: error.message }

  revalidar()
  return { ok: true as const, token }
}
