import { tz } from '@date-fns/tz'
import { endOfDay, isSameDay, startOfDay } from 'date-fns'
import { cookies } from 'next/headers'
import { ComparativoEquipes } from '@/components/home/comparativo-equipes'
import { GraficoAtividade, GraficoFunil } from '@/components/home/dashboard-charts'
import { FollowUpList } from '@/components/home/followup-list'
import { GraficoOrigem } from '@/components/home/grafico-origem'
import { HeatmapAtividade } from '@/components/home/heatmap-atividade'
import { HomeHero } from '@/components/home/home-hero'
import { MetricCard } from '@/components/home/metric-card'
import { ProximosAgendamentos } from '@/components/home/proximos-agendamentos'
import { QuickActions } from '@/components/home/quick-actions'
import { RankingVendedores } from '@/components/home/ranking-vendedores'
import { requireContexto } from '@/lib/contexto'
import { filtrosDoEscopo, normalizarPapel, resolverVisao, type Escopo, type Papel } from '@/lib/escopo'
import { calcularMetricas } from '@/lib/metricas'
import { comparativoEquipes, rankingDaEquipe } from '@/lib/metricas-time'
import type { Periodo } from '@/lib/periodo'
import { formatBRLCompacto } from '@/lib/utils'

// fronteiras de dia no fuso do usuário (Brasil), não no do servidor (UTC em produção)
const SP = tz('America/Sao_Paulo')

const ROTULO_PAPEL: Record<Papel, string> = {
  franqueado: 'Franqueado',
  franqueado_gestor: 'Franqueado Gestor',
  vp: 'Vice-presidência',
}

// o pipeline segue a VISÃO escolhida no seletor, não o papel — o VP filtrado
// numa equipe vê "Pipeline da equipe", o gestor em "meus dados" vê a carteira
const ROTULO_PIPELINE: Record<Escopo['tipo'], string> = {
  proprio: 'Pipeline da carteira',
  equipe: 'Pipeline da equipe',
  global: 'Pipeline do grupo',
}

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios)

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const { periodo: p } = await searchParams
  const periodo: Periodo = p === 'hoje' || p === 'mes' ? p : '7d'
  const { supabase, profile } = await requireContexto()
  const papel: Papel = normalizarPapel(profile.papel)
  // a visão do seletor do header (cookie) estreita o escopo dentro do papel
  const escopo = resolverVisao(profile, (await cookies()).get('visao')?.value)

  const [metricas, { data: followups }, { data: proximos }, { data: equipe }] =
    await Promise.all([
      calcularMetricas(supabase, periodo, escopo),
      supabase
        .from('followups')
        .select('id, descricao, vence_em, lead_id, lead:leads(nome_cliente)')
        .match(filtrosDoEscopo(escopo))
        .is('concluido_em', null)
        .lte('vence_em', endOfDay(new Date(), { in: SP }).toISOString())
        .order('vence_em')
        .limit(8),
      supabase
        .from('agendamentos')
        .select('id, titulo, inicio, meet_link, lead:leads(nome_cliente)')
        .match(filtrosDoEscopo(escopo))
        .eq('status', 'agendado')
        .gte('inicio', new Date().toISOString())
        .order('inicio')
        .limit(5),
      supabase.from('teams').select('nome').eq('id', profile.team_id).single(),
    ])

  // painéis agregados seguem a visão: equipe → ranking dela (o VP filtrado
  // numa equipe também ganha), global → comparativo, próprio → nenhum
  const ranking =
    escopo.tipo === 'equipe' ? await rankingDaEquipe(supabase, periodo, escopo.teamId) : null
  const comparativo = escopo.tipo === 'global' ? await comparativoEquipes(supabase, periodo) : null

  const inicioHoje = startOfDay(new Date(), { in: SP })
  const itensFollowup = (followups ?? []).map((f) => ({
    ...f,
    situacao: (new Date(f.vence_em) < inicioHoje ? 'vencido' : 'hoje') as 'vencido' | 'hoje',
  }))

  // linha-resumo do hero: a página diz o que importa agora, com números reais.
  // Segue a visão escolhida — gestor olhando um membro vê a carteira dele.
  let resumo: string
  if (escopo.tipo === 'proprio') {
    const vencidos = itensFollowup.filter((f) => f.situacao === 'vencido').length
    const reunioesHoje = (proximos ?? []).filter((a) =>
      isSameDay(new Date(a.inicio), new Date(), { in: SP }),
    ).length
    // "Você" só quando a carteira é a do próprio usuário
    const dono = escopo.ownerId === profile.id ? 'Você tem' : 'Esta carteira tem'
    const partes: string[] = []
    if (vencidos > 0)
      partes.push(`${vencidos} ${plural(vencidos, 'follow-up vencido', 'follow-ups vencidos')}`)
    if (reunioesHoje > 0)
      partes.push(`${reunioesHoje} ${plural(reunioesHoje, 'reunião hoje', 'reuniões hoje')}`)
    resumo = partes.length
      ? `${dono} ${partes.join(' e ')}.`
      : 'Nenhuma pendência para hoje. Bom trabalho.'
  } else if (escopo.tipo === 'equipe') {
    const valor = (ranking ?? []).reduce((soma, r) => soma + r.valorFechado, 0)
    resumo =
      metricas.fechamentos > 0
        ? `A equipe fez ${metricas.fechamentos} ${plural(metricas.fechamentos, 'fechamento', 'fechamentos')} somando ${formatBRLCompacto(valor)} no período.`
        : 'A equipe ainda não fechou negócios no período.'
  } else {
    const valor = (comparativo ?? []).reduce((soma, e) => soma + e.valorFechado, 0)
    resumo = `As ${comparativo?.length ?? 0} equipes somaram ${formatBRLCompacto(valor)} em ${metricas.fechamentos} ${plural(metricas.fechamentos, 'fechamento', 'fechamentos')} no período.`
  }

  const contexto =
    papel === 'vp'
      ? 'Vice-presidência · Grupo Villela'
      : `${ROTULO_PAPEL[papel]} · ${equipe?.nome ?? 'Equipe'}`

  return (
    <div className="space-y-6">
      <HomeHero
        nome={profile.nome}
        contexto={contexto}
        resumo={resumo}
        destaque={{
          rotulo: ROTULO_PIPELINE[escopo.tipo],
          valor: formatBRLCompacto(metricas.pipelineAtivo),
        }}
        periodo={periodo}
      />

      <QuickActions />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard rotulo="Agendamentos" valor={String(metricas.agendamentos)} />
        <MetricCard rotulo="Propostas enviadas" valor={String(metricas.propostas)} />
        <MetricCard rotulo="Fechamentos" valor={String(metricas.fechamentos)} />
        <MetricCard
          rotulo="Taxa de conversão"
          valor={`${metricas.taxaConversao}%`}
          detalhe={`${metricas.fechamentos} de ${metricas.leadsCriados} leads no período`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GraficoAtividade dados={metricas.porDia} />
        </div>
        <GraficoOrigem dados={metricas.porOrigem} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GraficoFunil dados={metricas.porEstagio} />
        <div className="lg:col-span-2">
          <HeatmapAtividade dados={metricas.atividade} />
        </div>
      </div>

      {comparativo && <ComparativoEquipes dados={comparativo} />}
      {ranking && <RankingVendedores dados={ranking} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <FollowUpList itens={itensFollowup} />
        <ProximosAgendamentos itens={proximos ?? []} />
      </div>
    </div>
  )
}
