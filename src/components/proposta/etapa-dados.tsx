'use client'

import { format } from 'date-fns'
import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { projetarDivida, simularReducao } from '@/lib/proposta-comercial/calculos'
import type { PropostaComercialForm } from '@/lib/proposta-comercial/tipos'
import { formatBRL } from '@/lib/utils'
import { Campo, CampoMoeda, Secao } from './campo'

// A consulta pública da PGFN não aceita CNPJ por querystring — o caminho
// simples é abrir a lista de devedores e colar o CNPJ copiado aqui do lado.
const URL_PGFN = 'https://www.listadevedores.pgfn.gov.br/'

const n = (v: string) => {
  const x = Number(v)
  return v !== '' && Number.isFinite(x) ? x : 0
}

export function EtapaDados({
  form,
  onCliente,
  onDiagnostico,
  onPgfn,
  onRaiz,
  onPrevisao,
  onAvancar,
}: {
  form: PropostaComercialForm
  onCliente: (p: Partial<PropostaComercialForm['cliente']>) => void
  onDiagnostico: (p: Partial<PropostaComercialForm['diagnostico']>) => void
  onPgfn: (p: Partial<PropostaComercialForm['pgfn']>) => void
  onRaiz: (p: Partial<Pick<PropostaComercialForm, 'valorTotalDivida' | 'reducaoPct'>>) => void
  onPrevisao: (p: Partial<PropostaComercialForm['previsao']>) => void
  onAvancar: () => void
}) {
  const simulacao = simularReducao(n(form.valorTotalDivida), n(form.reducaoPct))
  const divida = n(form.valorTotalDivida)
  const aumento6m = Math.max(0, n(form.previsao.divida6m) - divida)
  const aumento12m = Math.max(0, n(form.previsao.divida12m) - divida)

  function recalcularPrevisao() {
    const proj = projetarDivida(divida)
    if (!proj) {
      toast.error('Informe a dívida original primeiro.')
      return
    }
    onPrevisao({ divida6m: String(proj.divida6m), divida12m: String(proj.divida12m) })
  }

  async function copiarCnpj() {
    if (!form.cliente.cpfCnpj) {
      toast.error('Preencha o CNPJ antes de copiar.')
      return
    }
    await navigator.clipboard.writeText(form.cliente.cpfCnpj)
    toast.success('CNPJ copiado.')
  }

  return (
    <div className="space-y-4">
      <Secao titulo="Dados do cliente">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            id="pc-nome"
            rotulo="Cliente"
            valor={form.cliente.nomeCliente}
            onValor={(v) => onCliente({ nomeCliente: v })}
          />
          <Campo
            id="pc-empresa"
            rotulo="Empresa"
            valor={form.cliente.empresa}
            onValor={(v) => onCliente({ empresa: v })}
          />
          <Campo
            id="pc-cnpj"
            rotulo="CNPJ"
            valor={form.cliente.cpfCnpj}
            onValor={(v) => onCliente({ cpfCnpj: v })}
            sufixo={
              <Button type="button" variant="outline" size="icon" aria-label="Copiar CNPJ" onClick={copiarCnpj}>
                <Copy className="size-4" />
              </Button>
            }
          />
          <div className="space-y-1.5">
            <Label htmlFor="pc-reuniao">Data da reunião</Label>
            <Input
              id="pc-reuniao"
              readOnly
              value={
                form.cliente.dataReuniao
                  ? format(new Date(form.cliente.dataReuniao), "dd/MM/yyyy 'às' HH:mm")
                  : '—'
              }
              className="bg-muted/50"
            />
          </div>
          <Campo
            id="pc-franqueado"
            rotulo="Franqueado"
            valor={form.cliente.franqueado}
            onValor={(v) => onCliente({ franqueado: v })}
          />
          <Campo
            id="pc-closer"
            rotulo="Celular do franqueado (aparece na proposta)"
            tipo="tel"
            valor={form.cliente.whatsappCloser}
            onValor={(v) => onCliente({ whatsappCloser: v })}
            placeholder="(11) 99999-9999"
          />
          <Campo
            id="pc-tel-empresa"
            rotulo="Telefone da empresa"
            tipo="tel"
            valor={form.cliente.telefoneEmpresa}
            onValor={(v) => onCliente({ telefoneEmpresa: v })}
          />
          <Campo
            id="pc-tel-whats"
            rotulo="Telefone WhatsApp"
            tipo="tel"
            valor={form.cliente.telefoneWhatsapp}
            onValor={(v) => onCliente({ telefoneWhatsapp: v })}
          />
        </div>
      </Secao>

      <Secao titulo="Diagnóstico financeiro extraído">
        <div className="mb-4 rounded-lg bg-accent/40 p-4">
          <CampoMoeda
            id="pc-capital"
            rotulo="Capital recuperável previsto (editável)"
            valor={form.diagnostico.capitalRecuperavel}
            onValor={(v) => onDiagnostico({ capitalRecuperavel: v })}
            className="font-display text-lg font-bold text-[color:#16a34a]"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            id="pc-score"
            rotulo="Score"
            tipo="number"
            valor={form.diagnostico.score}
            onValor={(v) => onDiagnostico({ score: v })}
          />
          <CampoMoeda
            id="pc-div-fiscal"
            rotulo="Débitos fiscais"
            valor={form.diagnostico.dividaFiscal}
            onValor={(v) => onDiagnostico({ dividaFiscal: v })}
          />
          <CampoMoeda
            id="pc-div-bancaria"
            rotulo="Débitos bancários"
            valor={form.diagnostico.dividaBancaria}
            onValor={(v) => onDiagnostico({ dividaBancaria: v })}
          />
          <CampoMoeda
            id="pc-div-trabalhista"
            rotulo="Débitos trabalhistas"
            valor={form.diagnostico.dividaTrabalhista}
            onValor={(v) => onDiagnostico({ dividaTrabalhista: v })}
          />
        </div>
      </Secao>

      <Secao
        titulo="Dados da dívida (PGFN)"
        acao={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copiarCnpj}>
              <Copy className="size-3.5" /> Copiar CNPJ
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={URL_PGFN} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" /> Consultar PGFN
              </a>
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoMoeda
            id="pc-pgfn-valor"
            rotulo="Valor total da dívida PGFN"
            valor={form.pgfn.valorDivida}
            onValor={(v) => onPgfn({ valorDivida: v })}
          />
          <div className="space-y-1.5">
            <Label htmlFor="pc-pgfn-obs">Observação</Label>
            <Textarea
              id="pc-pgfn-obs"
              rows={2}
              value={form.pgfn.observacao}
              onChange={(e) => onPgfn({ observacao: e.target.value })}
              placeholder="Ex.: inclui débito previdenciário de R$ 121.994,10"
            />
          </div>
        </div>
      </Secao>

      <Secao titulo="Simulação de redução">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoMoeda
            id="pc-divida-total"
            rotulo="Dívida original *"
            valor={form.valorTotalDivida}
            onValor={(v) => onRaiz({ valorTotalDivida: v })}
          />
          <div className="space-y-1.5">
            <Label htmlFor="pc-reducao-pct">Redução prevista (%)</Label>
            <Input
              id="pc-reducao-pct"
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.reducaoPct}
              onChange={(e) => onRaiz({ reducaoPct: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-4 rounded-lg bg-muted/60 p-4 text-center sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Dívida original</p>
            <p className="font-display text-lg font-bold text-destructive">
              {formatBRL(n(form.valorTotalDivida) || null)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Redução</p>
            <p className="font-display text-lg font-bold text-[color:#16a34a]">
              {formatBRL(simulacao.reducao || null)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Consolidado</p>
            <p className="font-display text-lg font-bold text-[color:var(--villela-teal-escuro)]">
              {formatBRL(n(form.valorTotalDivida) > 0 ? simulacao.consolidado : null)}
            </p>
          </div>
        </div>
      </Secao>

      <Secao
        titulo="Previsão de aumento da dívida (sem ação)"
        acao={
          <Button type="button" variant="outline" size="sm" onClick={recalcularPrevisao}>
            Recalcular
          </Button>
        }
      >
        <p className="mb-3 text-xs text-muted-foreground">
          Quanto a dívida cresce se nada for feito. Pré-calculada da dívida atual (+15% em 6 meses,
          +32% em 12) e editável.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <CampoMoeda
              id="pc-prev-6m"
              rotulo="Dívida em 6 meses"
              valor={form.previsao.divida6m}
              onValor={(v) => onPrevisao({ divida6m: v })}
            />
            <p className="text-xs text-[color:#dc2626]">
              Aumento estimado: {formatBRL(aumento6m || null)}
            </p>
          </div>
          <div className="space-y-1.5">
            <CampoMoeda
              id="pc-prev-12m"
              rotulo="Dívida em 12 meses"
              valor={form.previsao.divida12m}
              onValor={(v) => onPrevisao({ divida12m: v })}
            />
            <p className="text-xs text-[color:#dc2626]">
              Aumento estimado: {formatBRL(aumento12m || null)}
            </p>
          </div>
        </div>
      </Secao>

      <div className="flex justify-end">
        <Button type="button" size="lg" onClick={onAvancar}>
          Precificar agora
        </Button>
      </div>
    </div>
  )
}
