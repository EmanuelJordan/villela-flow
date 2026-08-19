import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'
import { compararSolucoes } from '@/lib/proposta-comercial/calculos'
import { LOGO_VILLELA } from '@/lib/proposta-comercial/logo-villela'
import {
  CHAMADA_FINAL,
  CONTRAS_CONVENCIONAL,
  INSTITUCIONAL,
  PILARES,
  PROS_ESTRATEGIA,
} from '@/lib/proposta-comercial/conteudo-institucional'
import type { ApresentacaoProposta } from '@/lib/validators/proposta-comercial'
import { formatBRL, formatCpfCnpj } from '@/lib/utils'
import type { CondicoesComerciais } from './apresentacao-proposta'

// Proposta completa em várias páginas, fiel ao material do Grupo Villela. Módulo
// carregado só por import dinâmico no clique de "Baixar PDF" — nenhuma página
// paga o peso do @react-pdf à toa. Helvetica embutida (registrar as fontes da
// marca triplicaria a chunk); a identidade é recriada em vetor/texto.

const NAVY = '#081e2e'
const NAVY_CARD = '#0d2739'
const CIANO = '#00bce5'
const TEAL = '#3cb5c9'
const TEAL_ESCURO = '#116780'
const VERDE = '#16a34a'
const VERMELHO = '#e5484d'
const AMBAR = '#eab308'
const CINZA = '#4a6572'
const CINZA_CLARO = '#9fb3c0'
const BORDA = '#dbe3e0'
const BG_HEADER = '#dcecf3'
const BRANCO = '#ffffff'

const s = StyleSheet.create({
  pagina: { padding: 34, fontSize: 10, fontFamily: 'Helvetica', color: '#0a323c' },
  // header página 1
  header: {
    backgroundColor: BG_HEADER,
    borderRadius: 8,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planoTag: {
    alignSelf: 'flex-start',
    backgroundColor: CIANO,
    color: BRANCO,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  planoNome: { color: NAVY, fontSize: 30, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  planoSub: { color: TEAL_ESCURO, fontSize: 12, marginTop: 1 },
  logo: { width: 150, alignSelf: 'flex-start' },

  // rótulos de seção com barra
  secaoTitulo: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: TEAL_ESCURO,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: CIANO,
  },
  secao: { marginBottom: 16 },

  card: { borderWidth: 1, borderColor: BORDA, borderRadius: 6, padding: 12 },
  cardRotulo: { color: TEAL, fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5, textTransform: 'uppercase' },
  cardValor: { color: NAVY, fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  cardValorPeq: { color: NAVY, fontSize: 10, marginTop: 3 },

  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  grid2Item: { width: '48%' },
  colunas3: { flexDirection: 'row', gap: 10 },
  coluna: { flex: 1 },

  // stat cards da análise de débitos
  statCard: { flex: 1, borderRadius: 6, borderWidth: 1, borderLeftWidth: 3, padding: 10 },
  statRotulo: { fontSize: 7, color: CINZA, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValor: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 3 },

  debitosBox: { marginTop: 10, borderWidth: 1, borderColor: BORDA, borderRadius: 6, padding: 12 },
  debitoLinha: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  debitoRotulo: { color: CINZA },
  debitoValor: { fontFamily: 'Helvetica-Bold' },

  // cards navy (previsão, comparativo, institucional)
  cardNavy: { backgroundColor: NAVY, borderRadius: 8, padding: 14 },
  cardNavyTitulo: { color: BRANCO, fontSize: 11, fontFamily: 'Helvetica-Bold' },

  // página institucional
  cardTeal: { backgroundColor: TEAL_ESCURO, borderRadius: 8, padding: 16, marginBottom: 14 },
  refTitulo: { color: BRANCO, fontSize: 22, fontFamily: 'Helvetica-Bold' },
  refTexto: { color: '#e6f4f9', fontSize: 10, marginTop: 8, lineHeight: 1.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 12 },
  chip: {
    backgroundColor: '#1c7f97',
    color: BRANCO,
    fontSize: 8,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 10,
  },
  numerosRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  numeroBox: { flex: 1, alignItems: 'center' },
  numeroValor: { color: CIANO, fontSize: 13, fontFamily: 'Helvetica-Bold' },
  numeroRotulo: { color: CINZA_CLARO, fontSize: 6.5, textAlign: 'center', marginTop: 2 },

  pilar: { flex: 1, backgroundColor: NAVY_CARD, borderRadius: 6, padding: 10 },
  pilarTitulo: { color: CIANO, fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  pilarItem: { color: '#cdd9e0', fontSize: 8, marginBottom: 4, lineHeight: 1.3 },
  pilarSelo: { color: BRANCO, fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 6 },
  pilarSeloDet: { color: CINZA_CLARO, fontSize: 7, marginTop: 1 },

  // comparativo
  compItem: { fontSize: 8.5, marginBottom: 5, lineHeight: 1.3 },
  compEntrada: { borderTopWidth: 1, borderTopColor: '#22475c', marginTop: 8, paddingTop: 8, alignItems: 'center' },
  compEntradaRotulo: { color: CINZA_CLARO, fontSize: 8 },
  compEntradaValor: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 2 },

  resumoLinha: { backgroundColor: '#12324a', borderRadius: 5, padding: 8, marginBottom: 6, alignItems: 'center' },
  resumoRotulo: { color: CINZA_CLARO, fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.5 },
  resumoValor: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 2 },

  faixa: { marginTop: 12, borderWidth: 1, borderColor: BORDA, borderRadius: 6, padding: 10, textAlign: 'center' },

  // página final
  ctaCard: { backgroundColor: NAVY, borderRadius: 10, padding: 28, alignItems: 'center' },
  ctaTitulo: { color: BRANCO, fontSize: 18, marginBottom: 10, textAlign: 'center' },
  ctaTexto: { color: '#cdd9e0', fontSize: 10, textAlign: 'center', lineHeight: 1.5, maxWidth: 360 },
  ctaAssinatura: { color: CIANO, fontSize: 22, fontFamily: 'Helvetica-Bold', marginTop: 20 },
  ctaTagline: { color: CINZA_CLARO, fontSize: 9, marginTop: 3 },

  rodapePagina: {
    position: 'absolute',
    left: 34,
    right: 34,
    bottom: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: CINZA_CLARO,
    fontSize: 7,
  },
})

function dataBR(iso: string | undefined | null): string | null {
  if (!iso) return null
  const d = iso.length <= 10 ? parseISO(iso) : new Date(iso)
  return Number.isNaN(d.getTime()) ? null : format(d, 'dd/MM/yyyy')
}

function CampoCard({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={[s.card, s.grid2Item]}>
      <Text style={s.cardRotulo}>{rotulo}</Text>
      <Text style={s.cardValor}>{valor}</Text>
    </View>
  )
}

function DebitoLinha({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <View style={s.debitoLinha}>
      <Text style={s.debitoRotulo}>{rotulo}</Text>
      <Text style={[s.debitoValor, cor ? { color: cor } : {}]}>{valor}</Text>
    </View>
  )
}

function Rodape() {
  return (
    <View style={s.rodapePagina} fixed>
      <Text>Grupo Villela · Recuperação Empresarial</Text>
      {/* numeração automática — a página de previsão é condicional */}
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

export function PropostaPdfDoc({
  apresentacao,
  condicoes,
  url,
}: {
  apresentacao: ApresentacaoProposta | null
  condicoes: CondicoesComerciais
  url?: string
}) {
  const cliente = apresentacao?.cliente ?? {}
  const especialista = apresentacao?.especialista ?? {}
  const diagnostico = apresentacao?.diagnostico ?? {}
  const simulacao = apresentacao?.simulacao ?? {}
  const previsao = apresentacao?.previsao ?? {}

  const divida = simulacao.dividaOriginal ?? 0
  const reducaoPct = simulacao.reducaoPct ?? 0
  const temSimulacao = divida > 0
  const temPrevisao = (previsao.divida6m ?? 0) > 0 || (previsao.divida12m ?? 0) > 0

  const comp = temSimulacao
    ? compararSolucoes({
        dividaTotal: divida,
        reducaoPct,
        valorEstrategia: condicoes.valorEstrategia ?? 0,
        qtdParcelas: condicoes.qtdParcelas ?? 1,
        valorEntrada: condicoes.valorEntrada ?? 0,
      })
    : null

  const validadeBR = dataBR(condicoes.dataValidade)
  const geradaBR = dataBR(condicoes.geradaEm)

  return (
    <Document title="Proposta Comercial — Grupo Villela" author="Grupo Villela">
      {/* ---------- PÁGINA 1: capa + cliente + análise de débitos ---------- */}
      <Page size="A4" style={s.pagina}>
        <View style={s.header}>
          <View>
            <Text style={s.planoTag}>PLANO</Text>
            <Text style={s.planoNome}>RECUPERE</Text>
            <Text style={s.planoSub}>Recuperação Empresarial</Text>
          </View>
          {/* logo oficial embutido (data URI) — nada de fetch em runtime */}
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf, não é <img> DOM */}
          <Image src={LOGO_VILLELA} style={s.logo} />
        </View>

        {(especialista.nome || especialista.email || especialista.telefone) && (
          <View style={s.secao}>
            <Text style={s.secaoTitulo}>Dados do nosso especialista</Text>
            <View style={s.card}>
              <Text style={s.cardRotulo}>Closer responsável</Text>
              {especialista.nome && <Text style={s.cardValor}>{especialista.nome}</Text>}
              {especialista.telefone && (
                <Text style={[s.cardValorPeq, { color: TEAL_ESCURO, fontFamily: 'Helvetica-Bold' }]}>
                  Celular / WhatsApp: {especialista.telefone}
                </Text>
              )}
              {especialista.email && <Text style={s.cardValorPeq}>{especialista.email}</Text>}
            </View>
          </View>
        )}

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>Dados do cliente</Text>
          <View style={s.grid2}>
            {cliente.nomeCliente && <CampoCard rotulo="Nome do cliente" valor={cliente.nomeCliente} />}
            {cliente.empresa && <CampoCard rotulo="Empresa" valor={cliente.empresa} />}
            {cliente.cpfCnpj && <CampoCard rotulo="CNPJ" valor={formatCpfCnpj(cliente.cpfCnpj)} />}
            {(cliente.telefoneEmpresa || cliente.telefoneWhatsapp) && (
              <CampoCard
                rotulo="Telefones"
                valor={[cliente.telefoneEmpresa, cliente.telefoneWhatsapp].filter(Boolean).join(' · ')}
              />
            )}
          </View>
        </View>

        {temSimulacao && (
          <View style={s.secao}>
            <Text style={s.secaoTitulo}>Análise dos débitos</Text>
            <View style={s.colunas3}>
              <View style={[s.statCard, { borderColor: '#f3c9cb', borderLeftColor: VERMELHO }]}>
                <Text style={s.statRotulo}>Dívida total</Text>
                <Text style={[s.statValor, { color: VERMELHO }]}>{formatBRL(divida)}</Text>
              </View>
              <View style={[s.statCard, { borderColor: '#bfe6ee', borderLeftColor: CIANO }]}>
                <Text style={s.statRotulo}>Redução ({reducaoPct}%)</Text>
                <Text style={[s.statValor, { color: TEAL_ESCURO }]}>{formatBRL(simulacao.reducao)}</Text>
              </View>
              <View style={[s.statCard, { borderColor: '#c3e9d2', borderLeftColor: VERDE }]}>
                <Text style={s.statRotulo}>Saldo após redução</Text>
                <Text style={[s.statValor, { color: VERDE }]}>{formatBRL(simulacao.consolidado)}</Text>
              </View>
            </View>

            <View style={s.debitosBox}>
              <Text style={[s.cardRotulo, { color: CINZA, marginBottom: 8 }]}>Débitos</Text>
              {diagnostico.dividaFiscal != null && (
                <DebitoLinha rotulo="Fiscais" valor={formatBRL(diagnostico.dividaFiscal)} />
              )}
              {diagnostico.dividaBancaria != null && (
                <DebitoLinha rotulo="Bancários" valor={formatBRL(diagnostico.dividaBancaria)} />
              )}
              {diagnostico.dividaTrabalhista != null && (
                <DebitoLinha rotulo="Trabalhistas" valor={formatBRL(diagnostico.dividaTrabalhista)} />
              )}
              <DebitoLinha rotulo="Redução prevista" valor={`${reducaoPct}%`} cor={VERDE} />
            </View>
          </View>
        )}
        <Rodape />
      </Page>

      {/* ---------- PÁGINA 2: previsão de aumento da dívida ---------- */}
      {temPrevisao && (
        <Page size="A4" style={s.pagina}>
          <Text style={[s.secaoTitulo, { color: NAVY, borderBottomColor: AMBAR }]}>
            Previsão de aumento da dívida
          </Text>
          <Text style={{ color: CINZA, fontSize: 9, marginBottom: 14 }}>
            Estimativa do crescimento da dívida caso nenhuma ação seja tomada.
          </Text>
          <View style={s.colunas3}>
            <View style={[s.cardNavy, { flex: 1 }]}>
              <Text style={{ color: AMBAR, fontSize: 10, fontFamily: 'Helvetica-Bold' }}>
                CENÁRIO EM 6 MESES
              </Text>
              <Text style={{ color: CINZA_CLARO, fontSize: 8, marginTop: 10 }}>Aumento estimado</Text>
              <Text style={{ color: VERDE, fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 2 }}>
                + {formatBRL(previsao.aumento6m)}
              </Text>
              <Text style={{ color: CINZA_CLARO, fontSize: 8, marginTop: 10 }}>Dívida em 6 meses</Text>
              <Text style={{ color: VERMELHO, fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 2 }}>
                {formatBRL(previsao.divida6m)}
              </Text>
            </View>
            <View style={[s.cardNavy, { flex: 1 }]}>
              <Text style={{ color: VERMELHO, fontSize: 10, fontFamily: 'Helvetica-Bold' }}>
                CENÁRIO EM 12 MESES
              </Text>
              <Text style={{ color: CINZA_CLARO, fontSize: 8, marginTop: 10 }}>Aumento estimado</Text>
              <Text style={{ color: VERDE, fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 2 }}>
                + {formatBRL(previsao.aumento12m)}
              </Text>
              <Text style={{ color: CINZA_CLARO, fontSize: 8, marginTop: 10 }}>Dívida em 12 meses</Text>
              <Text style={{ color: VERMELHO, fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 2 }}>
                {formatBRL(previsao.divida12m)}
              </Text>
            </View>
          </View>
          <Rodape />
        </Page>
      )}

      {/* ---------- PÁGINA 3: institucional ---------- */}
      <Page size="A4" style={s.pagina}>
        <View style={s.cardTeal}>
          <Text style={s.refTitulo}>{INSTITUCIONAL.headline}</Text>
          <Text style={s.refTexto}>{INSTITUCIONAL.descricao}</Text>
          <View style={s.chips}>
            {INSTITUCIONAL.clientes.map((c) => (
              <Text key={c} style={s.chip}>
                {c}
              </Text>
            ))}
          </View>
        </View>

        <View style={[s.cardNavy, { marginBottom: 14 }]}>
          <Text style={{ color: BRANCO, fontSize: 15, fontFamily: 'Helvetica-Bold' }}>Grupo Villela</Text>
          <Text style={{ color: CINZA_CLARO, fontSize: 9 }}>Gestão Empresarial</Text>
          <Text style={{ color: '#cdd9e0', fontSize: 9, marginTop: 8 }}>
            Especialistas em cuidar das finanças de empresas.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {INSTITUCIONAL.especialidades.map((e) => (
              <Text key={e} style={{ color: CIANO, fontSize: 8 }}>
                · {e}
              </Text>
            ))}
          </View>
          <View style={s.numerosRow}>
            {INSTITUCIONAL.numeros.map((num) => (
              <View key={num.rotulo} style={s.numeroBox}>
                <Text style={s.numeroValor}>{num.valor}</Text>
                <Text style={s.numeroRotulo}>{num.rotulo}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.cardNavy}>
          <Text style={[s.cardNavyTitulo, { textAlign: 'center', fontSize: 14 }]}>Faremos o simples</Text>
          <Text style={{ color: CINZA_CLARO, fontSize: 8, textAlign: 'center', marginBottom: 10 }}>
            Nossa metodologia em 3 pilares para recuperar sua empresa
          </Text>
          <View style={s.colunas3}>
            {PILARES.map((p) => (
              <View key={p.titulo} style={s.pilar}>
                <Text style={s.pilarTitulo}>{p.titulo}</Text>
                {p.itens.map((it) => (
                  <Text key={it} style={s.pilarItem}>
                    • {it}
                  </Text>
                ))}
                <Text style={s.pilarSelo}>{p.selo}</Text>
                <Text style={s.pilarSeloDet}>{p.seloDetalhe}</Text>
              </View>
            ))}
          </View>
        </View>
        <Rodape />
      </Page>

      {/* ---------- PÁGINA 4: comparativo + investimento ---------- */}
      <Page size="A4" style={s.pagina}>
        <Text style={[s.secaoTitulo, { color: NAVY, borderBottomColor: AMBAR, textAlign: 'center' }]}>
          Comparativo de soluções
        </Text>

        {comp && (
          <View style={s.colunas3}>
            <View style={[s.cardNavy, { flex: 1 }]}>
              <Text style={{ color: VERMELHO, fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 8 }}>
                PARCELAMENTO CONVENCIONAL
              </Text>
              {CONTRAS_CONVENCIONAL.map((c) => (
                <Text key={c} style={[s.compItem, { color: '#cdd9e0' }]}>
                  ✕ {c}
                </Text>
              ))}
              <View style={s.compEntrada}>
                <Text style={s.compEntradaRotulo}>Entrada</Text>
                <Text style={[s.compEntradaValor, { color: VERMELHO }]}>
                  {formatBRL(comp.convencional.entrada)}
                </Text>
                <Text style={[s.compEntradaRotulo, { marginTop: 4 }]}>Parcela</Text>
                <Text style={[s.compEntradaValor, { color: VERMELHO }]}>
                  {formatBRL(comp.convencional.parcela)}
                </Text>
              </View>
            </View>

            <View style={[s.cardNavy, { flex: 1 }]}>
              <Text style={{ color: CIANO, fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 8 }}>
                ESTRATÉGIA VILLELA
              </Text>
              <Text style={[s.compItem, { color: '#cdd9e0' }]}>✓ {PROS_ESTRATEGIA[0]}</Text>
              <Text style={[s.compItem, { color: '#cdd9e0' }]}>
                ✓ Redução da dívida de {reducaoPct}%
              </Text>
              {PROS_ESTRATEGIA.slice(1).map((p) => (
                <Text key={p} style={[s.compItem, { color: '#cdd9e0' }]}>
                  ✓ {p}
                </Text>
              ))}
              <Text style={[s.compItem, { color: '#cdd9e0' }]}>
                ✓ Parcelamento em até {comp.estrategia.parcelas}x
              </Text>
              <View style={s.compEntrada}>
                <Text style={s.compEntradaRotulo}>Entrada</Text>
                <Text style={[s.compEntradaValor, { color: VERDE }]}>R$ 0</Text>
                <Text style={[s.compEntradaRotulo, { marginTop: 4 }]}>Parcela</Text>
                <Text style={[s.compEntradaValor, { color: CIANO }]}>
                  {formatBRL(comp.estrategia.parcela)}
                </Text>
              </View>
            </View>

            <View style={[s.cardNavy, { flex: 1 }]}>
              <Text style={{ color: AMBAR, fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 8 }}>
                RESUMO — ESTRATÉGIA
              </Text>
              <View style={s.resumoLinha}>
                <Text style={s.resumoRotulo}>Redução de</Text>
                <Text style={[s.resumoValor, { color: CIANO }]}>{formatBRL(comp.reducaoValor)}</Text>
              </View>
              <View style={s.resumoLinha}>
                <Text style={s.resumoRotulo}>Parcela</Text>
                <Text style={[s.resumoValor, { color: BRANCO }]}>{comp.parcelaMenorPct}%</Text>
                <Text style={{ color: CINZA_CLARO, fontSize: 7 }}>menor que convencional</Text>
              </View>
              <View style={s.resumoLinha}>
                <Text style={s.resumoRotulo}>Economia mensal</Text>
                <Text style={[s.resumoValor, { color: VERDE }]}>{formatBRL(comp.economiaMensal)}</Text>
              </View>
              <View style={s.resumoLinha}>
                <Text style={s.resumoRotulo}>Economia anual</Text>
                <Text style={[s.resumoValor, { color: VERDE }]}>{formatBRL(comp.economiaAnual)}</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={[s.secaoTitulo, { color: NAVY, borderBottomColor: CIANO, marginTop: 18 }]}>
          Investimento na estratégia de recuperação
        </Text>
        {comp && (
          <View style={s.colunas3}>
            <View style={[s.cardNavy, { flex: 1 }]}>
              <Text style={{ color: VERMELHO, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' }}>
                SUA DÍVIDA HOJE
              </Text>
              <Text style={{ color: CINZA_CLARO, fontSize: 8, textAlign: 'center', marginTop: 8 }}>
                Dívida total
              </Text>
              <Text style={{ color: VERMELHO, fontSize: 15, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 2 }}>
                {formatBRL(divida)}
              </Text>
            </View>
            <View style={[s.cardNavy, { flex: 1, borderWidth: 1, borderColor: AMBAR }]}>
              <Text style={{ color: AMBAR, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' }}>
                APÓS NOSSA AUDITORIA
              </Text>
              <Text style={{ color: CINZA_CLARO, fontSize: 8, textAlign: 'center', marginTop: 8 }}>
                Redução estimada
              </Text>
              <Text style={{ color: CIANO, fontSize: 22, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 2 }}>
                {reducaoPct}%
              </Text>
              <Text style={{ color: CINZA_CLARO, fontSize: 7, textAlign: 'center', marginTop: 6 }}>
                Dívida cai para {formatBRL(comp.estrategia.consolidado)}
              </Text>
            </View>
            <View style={[s.cardNavy, { flex: 1 }]}>
              <Text style={{ color: VERDE, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' }}>
                INVESTIMENTO
              </Text>
              <Text style={{ color: CINZA_CLARO, fontSize: 8, textAlign: 'center', marginTop: 8 }}>
                Valor da estratégia
              </Text>
              <Text style={{ color: BRANCO, fontSize: 15, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 2 }}>
                {formatBRL(condicoes.valorEstrategia)}
              </Text>
              {condicoes.qtdParcelas != null && comp.investimentoParcela > 0 && (
                <Text style={{ color: '#cdd9e0', fontSize: 9, textAlign: 'center', marginTop: 4 }}>
                  {condicoes.qtdParcelas}x de {formatBRL(comp.investimentoParcela)}
                </Text>
              )}
              {comp.roi > 0 && (
                <Text style={{ color: CIANO, fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 6 }}>
                  ROI {Math.round(comp.roi)}x
                </Text>
              )}
            </View>
          </View>
        )}

        {comp && condicoes.valorEstrategia != null && (
          <View style={s.faixa}>
            <Text>
              Investir{' '}
              <Text style={{ color: TEAL_ESCURO, fontFamily: 'Helvetica-Bold' }}>
                {formatBRL(condicoes.valorEstrategia)}
              </Text>{' '}
              para recuperar{' '}
              <Text style={{ color: VERDE, fontFamily: 'Helvetica-Bold' }}>
                {formatBRL(comp.reducaoValor)}
              </Text>
              {comp.percentualRecuperado > 0
                ? ` — apenas ${comp.percentualRecuperado.toFixed(1).replace('.', ',')}% do valor recuperado.`
                : '.'}
            </Text>
            {validadeBR && (
              <Text style={{ color: CINZA, fontSize: 8, marginTop: 4 }}>Proposta válida até {validadeBR}</Text>
            )}
          </View>
        )}
        <Rodape />
      </Page>

      {/* ---------- PÁGINA 5: chamada final ---------- */}
      <Page size="A4" style={s.pagina}>
        <View style={s.ctaCard}>
          <Text style={s.ctaTitulo}>{CHAMADA_FINAL.titulo}</Text>
          <Text style={s.ctaTexto}>{CHAMADA_FINAL.texto}</Text>
          <Text style={s.ctaAssinatura}>{CHAMADA_FINAL.assinatura}</Text>
          <Text style={s.ctaTagline}>{CHAMADA_FINAL.tagline}</Text>
        </View>

        <View style={[s.faixa, { marginTop: 16, textAlign: 'left' }]}>
          <Text style={{ fontFamily: 'Helvetica-Bold', color: NAVY }}>Acesse para saber mais</Text>
          <Text style={{ color: TEAL_ESCURO, fontSize: 9, marginTop: 2 }}>{CHAMADA_FINAL.site}</Text>
          {url && (
            <Text style={{ color: CINZA, fontSize: 8, marginTop: 6 }}>
              Apresentação online desta proposta: {url}
            </Text>
          )}
          {geradaBR && (
            <Text style={{ color: CINZA_CLARO, fontSize: 8, marginTop: 6 }}>
              {CHAMADA_FINAL.rodape} · Proposta gerada em {geradaBR}
            </Text>
          )}
        </View>
        <Rodape />
      </Page>
    </Document>
  )
}
