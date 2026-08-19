'use client'

import { addMinutes, format } from 'date-fns'
import { Link2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { criarAgendamento } from '@/actions/agendamentos'
import { executarExtracao } from '@/actions/diagnostico'
import type { DiagnosticoExtraido } from '@/lib/diagnostico/types'
import { ReuniaoDialog, type ReuniaoInfo } from '@/components/agendamento/reuniao-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { formatBRL, formatCpfCnpj } from '@/lib/utils'

type LeadCombo = { id: string; nome_cliente: string; empresa: string | null; cpf_cnpj: string | null; valor_divida: number | null }

function tituloDoLead(l: LeadCombo) {
  return `Reunião — ${l.nome_cliente}`
}

function descricaoDoLead(l: LeadCombo) {
  return [
    l.empresa && `Empresa: ${l.empresa}`,
    l.cpf_cnpj && `CNPJ/CPF: ${formatCpfCnpj(l.cpf_cnpj)}`,
    l.valor_divida != null && `Dívida: ${formatBRL(l.valor_divida)}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function AgendamentoForm({
  leadPreSelecionado,
  googleConectado,
}: {
  leadPreSelecionado: LeadCombo | null
  googleConectado: boolean
}) {
  // vem do funil por ?lead=<id>; a tela em si não busca mais leads
  const [lead, setLead] = useState<LeadCombo | null>(leadPreSelecionado)
  const [link, setLink] = useState('')
  const [extraindo, setExtraindo] = useState(false)
  // guarda os campos estruturados: o texto da descrição é para o humano, isto vai
  // para o banco e vira o card no Funil
  const [extraido, setExtraido] = useState<{
    cliente: string | null
    empresa?: string
    cpfCnpj?: string
    valorDivida?: number
    simulado: boolean
  } | null>(null)
  // objeto bruto do parser (com `detalhes`: capital recuperável, dívidas por
  // categoria, score) — vai inteiro para o banco e alimenta o assistente de
  // proposta. Só o `extraido` acima vira card do funil.
  const [diagnosticoDados, setDiagnosticoDados] = useState<DiagnosticoExtraido | null>(null)
  const [titulo, setTitulo] = useState(() => (leadPreSelecionado ? tituloDoLead(leadPreSelecionado) : ''))
  const [descricao, setDescricao] = useState(() =>
    leadPreSelecionado ? descricaoDoLead(leadPreSelecionado) : '',
  )
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [criarNoGoogle, setCriarNoGoogle] = useState(googleConectado)
  const [criada, setCriada] = useState<ReuniaoInfo | null>(null)
  const [pendente, startTransition] = useTransition()

  async function extrair() {
    const url = link.trim()
    if (!url) return toast.error('Cole o link do diagnóstico primeiro.')
    setExtraindo(true)
    const r = await executarExtracao(url)
    setExtraindo(false)
    if (!r.sucesso || !r.dados) {
      setExtraido(null)
      setDiagnosticoDados(null)
      return toast.error(r.erro ?? 'Não foi possível ler o diagnóstico.')
    }
    const d = r.dados
    setDiagnosticoDados(d)
    // a reunião é com a empresa; o sócio continua na descrição.
    // Nada de capitalizar: a razão social vem em maiúsculas da Receita e é assim que ela vale.
    const nome = d.empresa ?? d.nomeCliente ?? null
    if (nome) setTitulo(`Reunião — ${nome}`)
    // resumo já vem formatado pelo parser; o stub não tem, então monta na mão
    setDescricao(
      d.resumo ??
        [
          d.empresa && `Empresa: ${d.empresa}`,
          d.cpfCnpj && `CNPJ/CPF: ${formatCpfCnpj(d.cpfCnpj)}`,
          d.valorDivida != null && `Dívida: ${formatBRL(d.valorDivida)}`,
        ]
          .filter(Boolean)
          .join('\n'),
    )
    setExtraido({
      cliente: nome,
      empresa: d.empresa,
      cpfCnpj: d.cpfCnpj,
      valorDivida: d.valorDivida,
      simulado: r.fonte === 'stub',
    })
    toast.success('Dados do diagnóstico preenchidos.')
  }

  function aoMudarInicio(v: string) {
    setInicio(v)
    if (v) setFim(format(addMinutes(new Date(v), 60), "yyyy-MM-dd'T'HH:mm"))
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const r = await criarAgendamento({
        titulo,
        descricao,
        inicio: new Date(inicio),
        fim: new Date(fim),
        lead_id: lead?.id,
        criar_no_google: criarNoGoogle,
        // sem lead, é o diagnóstico que dá identidade ao card no Funil
        empresa: extraido?.empresa ?? lead?.empresa ?? undefined,
        cpf_cnpj: extraido?.cpfCnpj ?? lead?.cpf_cnpj ?? undefined,
        valor_divida: extraido?.valorDivida ?? lead?.valor_divida ?? undefined,
        // o diagnóstico rico (com `detalhes`) só existe quando o link foi lido;
        // sem ele, o assistente de proposta cai no fallback do lead
        diagnostico_dados: (diagnosticoDados as Record<string, unknown> | null) ?? undefined,
      })
      if (!r.ok) {
        toast.error(r.erro)
        return
      }
      if (r.avisoGoogle) toast.warning(r.avisoGoogle)
      else toast.success('Agendamento criado.')

      // captura antes do reset — o dialog sobrevive ao formulário limpo
      setCriada({
        titulo,
        descricao,
        inicio: new Date(inicio).toISOString(),
        fim: new Date(fim).toISOString(),
        cliente: lead?.nome_cliente ?? extraido?.cliente ?? null,
        meetLink: r.meetLink ?? null,
      })
      setTitulo(''); setDescricao(''); setInicio(''); setFim('')
      // limpa também o contexto do cliente: o próximo agendamento pode ser de outro
      setLead(null); setLink(''); setExtraido(null); setDiagnosticoDados(null)
    })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-2 rounded-md border border-border bg-accent/40 p-3">
            <Label htmlFor="link-diagnostico" className="flex items-center gap-1.5">
              <Link2 className="size-3.5" />
              Link do diagnóstico
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="link-diagnostico"
                type="url"
                inputMode="url"
                placeholder="https://www.relatorios.suaempresa.com.br/diagnostico/…"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                // Enter no campo dispararia o submit do formulário; aqui ele extrai
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void extrair()
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={extrair} disabled={extraindo}>
                {extraindo ? 'Lendo…' : 'Preencher'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {extraido
                ? `Título e descrição preenchidos${extraido.cliente ? ` com os dados de ${extraido.cliente}` : ''}. Pode editar à vontade.`
                : 'Cole o link para preencher título e descrição automaticamente.'}
            </p>
            {extraido?.simulado && <Badge variant="outline">dados simulados (demo)</Badge>}
            {lead && (
              <p className="text-xs text-muted-foreground">
                Vinculado ao lead <span className="font-medium">{lead.nome_cliente}</span>.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início *</Label>
              <Input type="datetime-local" step={1800} value={inicio} onChange={(e) => aoMudarInicio(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Fim *</Label>
              <Input type="datetime-local" step={1800} value={fim} onChange={(e) => setFim(e.target.value)} required />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Criar no Google Calendar com link do Meet</p>
              {!googleConectado && (
                <p className="text-xs text-muted-foreground">
                  Conecte sua conta Google em{' '}
                  <a href="/configuracoes" className="text-primary underline-offset-4 hover:underline">
                    Configurações
                  </a>
                  .
                </p>
              )}
            </div>
            <Switch checked={criarNoGoogle} onCheckedChange={setCriarNoGoogle} disabled={!googleConectado} />
          </div>

          <Button type="submit" className="w-full" disabled={pendente}>
            {pendente ? 'Agendando…' : 'Agendar'}
          </Button>
        </form>

        {/* portalizado — abre sozinho ao criar e sobrevive ao reset do formulário */}
        <ReuniaoDialog reuniao={criada} open={criada !== null} onOpenChange={(v) => !v && setCriada(null)} />
      </CardContent>
    </Card>
  )
}
