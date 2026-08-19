'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { gerarPropostaComercial } from '@/actions/proposta-comercial'
import { Button } from '@/components/ui/button'
import { calcularParcela, calcularValidade, simularReducao } from '@/lib/proposta-comercial/calculos'
import type { PropostaComercialForm } from '@/lib/proposta-comercial/tipos'
import {
  propostaComercialSchema,
  type ApresentacaoProposta,
  type PropostaComercialInput,
} from '@/lib/validators/proposta-comercial'
import { cn } from '@/lib/utils'
import { ApresentacaoProposta as Apresentacao, type CondicoesComerciais } from './apresentacao-proposta'
import { EtapaDados } from './etapa-dados'
import { EtapaPrecificacao } from './etapa-precificacao'
import { PropostaGerada } from './proposta-gerada'
import { ResumoProposta } from './resumo-proposta'

type EtapaAssistente = 'revisao' | 'precificacao' | 'resumo' | 'previa'

const PASSOS: { id: Exclude<EtapaAssistente, 'previa'>; rotulo: string }[] = [
  { id: 'revisao', rotulo: 'Revisão dos dados' },
  { id: 'precificacao', rotulo: 'Precificação' },
  { id: 'resumo', rotulo: 'Resumo e geração' },
]

const num = (v: string) => {
  const x = Number(v)
  return v !== '' && Number.isFinite(x) ? x : undefined
}

/** Raízes de campo que vivem na etapa de revisão. O schema valida o formulário
 *  inteiro de uma vez, então é isto que leva o erro de volta à etapa dona do
 *  campo — senão o aviso aparece numa tela que nem tem o campo citado. */
const CAMPOS_ETAPA1 = new Set(['cliente', 'diagnostico', 'pgfn', 'valorTotalDivida', 'reducaoPct'])

/** Snapshot ao vivo do formulário — a prévia e o PDF veem o que a action gravaria. */
function apresentacaoDaTela(form: PropostaComercialForm, emailCloser: string): ApresentacaoProposta {
  const divida = num(form.valorTotalDivida) ?? 0
  const pct = num(form.reducaoPct) ?? 0
  const limpar = (v: string) => (v ? v : undefined)
  const d6 = num(form.previsao.divida6m)
  const d12 = num(form.previsao.divida12m)
  const aumento = (p: number | undefined) =>
    p != null ? Math.max(0, Math.round((p - divida) * 100) / 100) : undefined
  return {
    versao: 2,
    especialista: {
      nome: limpar(form.cliente.franqueado),
      email: limpar(emailCloser),
      telefone: limpar(form.cliente.whatsappCloser),
    },
    previsao: {
      divida6m: d6,
      aumento6m: aumento(d6),
      divida12m: d12,
      aumento12m: aumento(d12),
    },
    cliente: {
      nomeCliente: limpar(form.cliente.nomeCliente),
      empresa: limpar(form.cliente.empresa),
      cpfCnpj: limpar(form.cliente.cpfCnpj),
      dataReuniao: limpar(form.cliente.dataReuniao),
      franqueado: limpar(form.cliente.franqueado),
      whatsappCloser: limpar(form.cliente.whatsappCloser),
      telefoneEmpresa: limpar(form.cliente.telefoneEmpresa),
      telefoneWhatsapp: limpar(form.cliente.telefoneWhatsapp),
    },
    diagnostico: {
      score: num(form.diagnostico.score),
      capitalRecuperavel: num(form.diagnostico.capitalRecuperavel),
      dividaFiscal: num(form.diagnostico.dividaFiscal),
      dividaBancaria: num(form.diagnostico.dividaBancaria),
      dividaTrabalhista: num(form.diagnostico.dividaTrabalhista),
    },
    pgfn: { valorDivida: num(form.pgfn.valorDivida), observacao: limpar(form.pgfn.observacao) },
    simulacao: divida > 0 ? { dividaOriginal: divida, reducaoPct: pct, ...simularReducao(divida, pct) } : {},
  }
}

function condicoesDaTela(form: PropostaComercialForm): CondicoesComerciais {
  const p = form.precificacao
  const entrada = p.temEntrada ? num(p.valorEntrada) : undefined
  return {
    tituloEstrategia: p.tituloEstrategia || undefined,
    descricaoEstrategia: p.descricaoEstrategia || undefined,
    valorEstrategia: num(p.valorEstrategia),
    qtdParcelas: num(p.qtdParcelas),
    valorParcela: calcularParcela(num(p.valorEstrategia) ?? 0, num(p.qtdParcelas) ?? 0, entrada ?? 0),
    valorEntrada: entrada,
    dataValidade: calcularValidade(p.validadeDias),
  }
}

export function AssistenteProposta({
  agendamentoId,
  inicial,
  tokenExistente,
  emailCloser,
}: {
  agendamentoId: string
  inicial: PropostaComercialForm
  tokenExistente: string | null
  /** E-mail do usuário logado — vai congelado no snapshot como o do especialista. */
  emailCloser: string
}) {
  const [form, setForm] = useState(inicial)
  const [etapa, setEtapa] = useState<EtapaAssistente>('revisao')
  const [tokenGerado, setTokenGerado] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  const setCliente = (p: Partial<PropostaComercialForm['cliente']>) =>
    setForm((f) => ({ ...f, cliente: { ...f.cliente, ...p } }))
  const setDiagnostico = (p: Partial<PropostaComercialForm['diagnostico']>) =>
    setForm((f) => ({ ...f, diagnostico: { ...f.diagnostico, ...p } }))
  const setPgfn = (p: Partial<PropostaComercialForm['pgfn']>) =>
    setForm((f) => ({ ...f, pgfn: { ...f.pgfn, ...p } }))
  const setPrecificacao = (p: Partial<PropostaComercialForm['precificacao']>) =>
    setForm((f) => ({ ...f, precificacao: { ...f.precificacao, ...p } }))
  const setPrevisao = (p: Partial<PropostaComercialForm['previsao']>) =>
    setForm((f) => ({ ...f, previsao: { ...f.previsao, ...p } }))
  const setRaiz = (p: Partial<Pick<PropostaComercialForm, 'valorTotalDivida' | 'reducaoPct'>>) =>
    setForm((f) => ({ ...f, ...p }))

  function montarInput(): PropostaComercialInput {
    return {
      agendamento_id: agendamentoId,
      cliente: form.cliente,
      diagnostico: form.diagnostico,
      pgfn: form.pgfn,
      valorTotalDivida: form.valorTotalDivida,
      reducaoPct: form.reducaoPct,
      previsao: {
        divida6m: form.previsao.divida6m,
        divida12m: form.previsao.divida12m,
      },
      precificacao: {
        tituloEstrategia: form.precificacao.tituloEstrategia,
        valorEstrategia: form.precificacao.valorEstrategia,
        descricaoEstrategia: form.precificacao.descricaoEstrategia,
        qtdParcelas: form.precificacao.qtdParcelas,
        // entrada desligada não viaja — '' vira undefined no validator
        valorEntrada: form.precificacao.temEntrada ? form.precificacao.valorEntrada : '',
        validadeDias: form.precificacao.validadeDias,
      },
    }
  }

  function irParaPrecificacao() {
    const r = propostaComercialSchema.safeParse(montarInput())
    if (!r.success) {
      // a precificação ainda está em branco aqui; só barra o que é desta etapa
      const issue = r.error.issues.find((i) => CAMPOS_ETAPA1.has(String(i.path[0])))
      if (issue) {
        toast.error(issue.message)
        return
      }
    }
    setEtapa('precificacao')
  }

  function salvarPrecificacao() {
    const r = propostaComercialSchema.safeParse(montarInput())
    if (!r.success) {
      const issue = r.error.issues[0]
      if (CAMPOS_ETAPA1.has(String(issue.path[0]))) setEtapa('revisao')
      toast.error(issue.message)
      return
    }
    setEtapa('resumo')
  }

  function gerar() {
    startTransition(async () => {
      const r = await gerarPropostaComercial(montarInput())
      if (!r.ok) {
        toast.error(r.erro)
        return
      }
      setTokenGerado(r.token)
      toast.success(tokenExistente ? 'Proposta atualizada.' : 'Proposta gerada.')
    })
  }

  if (tokenGerado) {
    return (
      <PropostaGerada
        token={tokenGerado}
        apresentacao={apresentacaoDaTela(form, emailCloser)}
        condicoes={{ ...condicoesDaTela(form), geradaEm: new Date().toISOString() }}
      />
    )
  }

  const indiceAtual = PASSOS.findIndex((s) => s.id === (etapa === 'previa' ? 'resumo' : etapa))

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link href="/funil">
            <ArrowLeft className="size-4" /> Funil
          </Link>
        </Button>
      </div>
      <h1 className="font-display text-2xl font-bold">Montar Proposta Comercial</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Revise os dados importados e gere a proposta.
      </p>

      <ol className="mt-4 mb-6 flex flex-wrap items-center gap-2" aria-label="Etapas do assistente">
        {PASSOS.map((passo, i) => (
          <li key={passo.id} className="flex items-center gap-2">
            <span
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
                i === indiceAtual
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : i < indiceAtual
                    ? 'border-[var(--villela-teal)]/50 text-[var(--villela-teal-escuro)]'
                    : 'border-border text-muted-foreground',
              )}
            >
              <span className="font-display">{i + 1}</span> {passo.rotulo}
            </span>
            {i < PASSOS.length - 1 && <span className="text-muted-foreground/50">→</span>}
          </li>
        ))}
      </ol>

      {etapa === 'revisao' && (
        <EtapaDados
          form={form}
          onCliente={setCliente}
          onDiagnostico={setDiagnostico}
          onPgfn={setPgfn}
          onRaiz={setRaiz}
          onPrevisao={setPrevisao}
          onAvancar={irParaPrecificacao}
        />
      )}

      {etapa === 'precificacao' && (
        <EtapaPrecificacao
          form={form}
          onPrecificacao={setPrecificacao}
          onVoltar={() => setEtapa('revisao')}
          onSalvar={salvarPrecificacao}
        />
      )}

      {etapa === 'resumo' && (
        <ResumoProposta
          form={form}
          atualizando={tokenExistente !== null}
          pendente={pendente}
          onEditar={() => setEtapa('precificacao')}
          onPrevisualizar={() => setEtapa('previa')}
          onGerar={gerar}
        />
      )}

      {etapa === 'previa' && (
        <div className="space-y-4">
          <Apresentacao apresentacao={apresentacaoDaTela(form, emailCloser)} condicoes={condicoesDaTela(form)} />
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setEtapa('resumo')}>
              Voltar ao resumo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
