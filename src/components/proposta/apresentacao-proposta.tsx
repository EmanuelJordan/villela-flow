import { tz } from '@date-fns/tz'
import { format, isValid, parseISO } from 'date-fns'
import Image from 'next/image'
import { formatBRL, formatCpfCnpj } from '@/lib/utils'
import type { ApresentacaoProposta } from '@/lib/validators/proposta-comercial'

/** Esta view é renderizada no servidor (UTC) na página pública e no browser
 *  (BRT) na prévia — sem fixar o fuso, cliente e franqueado veem dias diferentes
 *  perto da meia-noite. O snapshot é jsonb: string inválida vira null em vez de
 *  derrubar a página com RangeError. */
const SP = tz('America/Sao_Paulo')

function dataBR(iso: string | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return isValid(d) ? format(d, 'dd/MM/yyyy', { in: SP }) : null
}

/** Condições comerciais exibidas junto do snapshot — vêm das colunas da
 *  proposta (página pública) ou do formulário ao vivo (prévia do assistente). */
export interface CondicoesComerciais {
  tituloEstrategia?: string
  descricaoEstrategia?: string
  valorEstrategia?: number
  qtdParcelas?: number
  valorParcela?: number
  valorEntrada?: number
  /** yyyy-MM-dd */
  dataValidade?: string
  /** ISO de quando a proposta foi gerada. */
  geradaEm?: string
}

const temAlgum = (o: Record<string, unknown>) =>
  Object.values(o).some((v) => v != null && v !== '')

function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="text-right font-medium">{valor}</span>
    </div>
  )
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

/**
 * A apresentação rica da proposta — o que o cliente abre pelo link público e o
 * que o franqueado vê na prévia. Renderiza só o que existe: proposta criada
 * pelo dialog rápido (sem snapshot) degrada para as condições comerciais.
 */
export function ApresentacaoProposta({
  apresentacao,
  condicoes,
}: {
  apresentacao: ApresentacaoProposta | null
  condicoes: CondicoesComerciais
}) {
  const cliente = apresentacao?.cliente ?? {}
  const diagnostico = apresentacao?.diagnostico ?? {}
  const pgfn = apresentacao?.pgfn ?? {}
  const simulacao = apresentacao?.simulacao ?? {}

  const temSimulacao = simulacao.dividaOriginal != null && simulacao.dividaOriginal > 0
  const reuniaoBR = dataBR(cliente.dataReuniao)
  const geradaBR = dataBR(condicoes.geradaEm)

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <header className="bg-[var(--villela-navy)] px-6 py-8 text-white sm:px-10">
        {/* chip branco: o wordmark do logo é navy e sumiria direto no fundo */}
        <div className="inline-flex items-center rounded-lg bg-white px-3 py-2">
          <Image
            src="/brand/logo-grupo-villela.png"
            alt="Grupo Villela — Gestão Empresarial"
            width={147}
            height={60}
            className="h-10 w-auto"
          />
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold">Proposta Comercial</h1>
        {cliente.empresa && <p className="mt-2 text-lg text-white/90">{cliente.empresa}</p>}
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/70">
          {cliente.cpfCnpj && <span>CNPJ/CPF {formatCpfCnpj(cliente.cpfCnpj)}</span>}
          {reuniaoBR && <span>Reunião em {reuniaoBR}</span>}
        </div>
      </header>

      <div className="space-y-4 p-4 sm:p-8">
        {temAlgum(cliente) && (
          <Cartao titulo="Dados do cliente">
            <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {cliente.nomeCliente && <Linha rotulo="Cliente" valor={cliente.nomeCliente} />}
              {cliente.empresa && <Linha rotulo="Empresa" valor={cliente.empresa} />}
              {cliente.cpfCnpj && <Linha rotulo="CNPJ/CPF" valor={formatCpfCnpj(cliente.cpfCnpj)} />}
              {cliente.franqueado && <Linha rotulo="Franqueado" valor={cliente.franqueado} />}
              {cliente.whatsappCloser && (
                <Linha rotulo="WhatsApp do closer" valor={cliente.whatsappCloser} />
              )}
              {cliente.telefoneEmpresa && (
                <Linha rotulo="Telefone da empresa" valor={cliente.telefoneEmpresa} />
              )}
              {cliente.telefoneWhatsapp && (
                <Linha rotulo="WhatsApp" valor={cliente.telefoneWhatsapp} />
              )}
            </div>
          </Cartao>
        )}

        {temAlgum(diagnostico) && (
          <Cartao titulo="Diagnóstico financeiro">
            {diagnostico.capitalRecuperavel != null && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground">Capital recuperável previsto</p>
                <p className="font-display text-2xl font-bold text-[color:#16a34a]">
                  {formatBRL(diagnostico.capitalRecuperavel)}
                </p>
              </div>
            )}
            <div className="space-y-2">
              {diagnostico.score != null && <Linha rotulo="Score" valor={diagnostico.score} />}
              {diagnostico.dividaFiscal != null && (
                <Linha rotulo="Débitos fiscais" valor={formatBRL(diagnostico.dividaFiscal)} />
              )}
              {diagnostico.dividaBancaria != null && (
                <Linha rotulo="Débitos bancários" valor={formatBRL(diagnostico.dividaBancaria)} />
              )}
              {diagnostico.dividaTrabalhista != null && (
                <Linha rotulo="Débitos trabalhistas" valor={formatBRL(diagnostico.dividaTrabalhista)} />
              )}
            </div>
          </Cartao>
        )}

        {pgfn.valorDivida != null && (
          <Cartao titulo="Dados da dívida (PGFN)">
            <p className="font-display text-2xl font-bold text-destructive">
              {formatBRL(pgfn.valorDivida)}
            </p>
            {pgfn.observacao && (
              <p className="mt-2 text-sm text-muted-foreground">{pgfn.observacao}</p>
            )}
          </Cartao>
        )}

        {temSimulacao && (
          <Cartao titulo="Simulação de redução">
            <div className="grid gap-4 text-center sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Dívida original</p>
                <p className="font-display text-xl font-bold text-destructive">
                  {formatBRL(simulacao.dividaOriginal)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Redução{simulacao.reducaoPct != null ? ` (${simulacao.reducaoPct}%)` : ''}
                </p>
                <p className="font-display text-xl font-bold text-[color:#16a34a]">
                  {formatBRL(simulacao.reducao)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Consolidado</p>
                <p className="font-display text-xl font-bold text-[color:var(--villela-teal-escuro)]">
                  {formatBRL(simulacao.consolidado)}
                </p>
              </div>
            </div>
          </Cartao>
        )}

        <Cartao titulo="Condições comerciais da proposta">
          {condicoes.tituloEstrategia && (
            <p className="text-base font-semibold">{condicoes.tituloEstrategia}</p>
          )}
          {condicoes.valorEstrategia != null && (
            <p className="mt-1 font-display text-3xl font-bold text-[color:var(--villela-teal-escuro)]">
              {formatBRL(condicoes.valorEstrategia)}
            </p>
          )}
          {condicoes.descricaoEstrategia && (
            <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
              {condicoes.descricaoEstrategia}
            </p>
          )}
          <div className="mt-4 space-y-2">
            {condicoes.qtdParcelas != null && condicoes.valorParcela != null && condicoes.valorParcela > 0 && (
              <Linha
                rotulo="Pagamento"
                valor={`${condicoes.qtdParcelas}x de ${formatBRL(condicoes.valorParcela)}`}
              />
            )}
            {condicoes.valorEntrada != null && condicoes.valorEntrada > 0 && (
              <Linha rotulo="Entrada" valor={formatBRL(condicoes.valorEntrada)} />
            )}
            {condicoes.dataValidade && (
              <Linha
                rotulo="Proposta válida até"
                valor={format(parseISO(condicoes.dataValidade), 'dd/MM/yyyy')}
              />
            )}
          </div>
        </Cartao>

        <p className="px-1 text-center text-xs text-muted-foreground">
          {geradaBR ? `Proposta gerada em ${geradaBR} · ` : ''}
          Villela Flow — Performance em Vendas
        </p>
      </div>
    </div>
  )
}
