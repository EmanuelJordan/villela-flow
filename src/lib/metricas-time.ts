import 'server-only'
import { rangeDoPeriodo, type Periodo } from '@/lib/periodo'
import {
  calcularComparativo,
  calcularRanking,
  type LinhaEquipe,
  type LinhaRanking,
} from '@/lib/ranking'
import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

async function idsEstagiosWon(supabase: Supabase): Promise<Set<string>> {
  const { data } = await supabase.from('funil_estagios').select('id, is_won')
  return new Set((data ?? []).filter((e) => e.is_won).map((e) => e.id))
}

type EventoComLead = {
  tipo: string
  para_estagio: string | null
  lead: { owner_id: string | null; valor_divida: number | null } | null
}

/** Ranking dos vendedores de uma equipe no período (dashboard do gestor). */
export async function rankingDaEquipe(
  supabase: Supabase,
  periodo: Periodo,
  teamId: string,
): Promise<LinhaRanking[]> {
  const { inicio, fim } = rangeDoPeriodo(periodo)
  const [idsWon, { data: vendedores }, { data: criados }, { data: agends }, { data: eventos }] =
    await Promise.all([
      idsEstagiosWon(supabase),
      // gestor gerencia, não compete — o ranking lista só os franqueados
      // ('sdr' é compat com o nome antigo durante a janela de deploy)
      supabase.from('profiles').select('id, nome').eq('team_id', teamId).in('papel', ['franqueado', 'sdr']),
      supabase
        .from('lead_eventos')
        .select('lead:leads(owner_id)')
        .eq('team_id', teamId)
        .eq('tipo', 'criado')
        .gte('created_at', inicio.toISOString())
        .lte('created_at', fim.toISOString()),
      supabase
        .from('agendamentos')
        .select('owner_id')
        .eq('team_id', teamId)
        .gte('created_at', inicio.toISOString())
        .lte('created_at', fim.toISOString()),
      supabase
        .from('lead_eventos')
        .select('tipo, para_estagio, lead:leads(owner_id, valor_divida)')
        .eq('team_id', teamId)
        .in('tipo', ['estagio_alterado', 'criado'])
        .gte('created_at', inicio.toISOString())
        .lte('created_at', fim.toISOString()),
    ])

  const fechamentos = ((eventos ?? []) as EventoComLead[])
    .filter((e) => e.para_estagio && idsWon.has(e.para_estagio))
    .map((e) => ({
      ownerId: e.lead?.owner_id ?? null,
      valorDivida: e.lead?.valor_divida != null ? Number(e.lead.valor_divida) : null,
    }))

  return calcularRanking(
    vendedores ?? [],
    ((criados ?? []) as { lead: { owner_id: string | null } | null }[]).map((e) => ({
      owner_id: e.lead?.owner_id ?? null,
    })),
    agends ?? [],
    fechamentos,
  )
}

type EventoComTeam = {
  team_id: string
  tipo: string
  para_estagio: string | null
  lead: { valor_divida: number | null } | null
}

/** Comparativo entre todas as equipes no período (dashboard do VP). */
export async function comparativoEquipes(
  supabase: Supabase,
  periodo: Periodo,
): Promise<LinhaEquipe[]> {
  const { inicio, fim } = rangeDoPeriodo(periodo)
  const [idsWon, { data: equipes }, { data: criados }, { data: agends }, { data: eventos }] =
    await Promise.all([
      idsEstagiosWon(supabase),
      supabase.from('teams').select('id, nome').order('created_at'),
      supabase
        .from('lead_eventos')
        .select('team_id')
        .eq('tipo', 'criado')
        .gte('created_at', inicio.toISOString())
        .lte('created_at', fim.toISOString()),
      supabase
        .from('agendamentos')
        .select('team_id')
        .gte('created_at', inicio.toISOString())
        .lte('created_at', fim.toISOString()),
      supabase
        .from('lead_eventos')
        .select('team_id, tipo, para_estagio, lead:leads(valor_divida)')
        .in('tipo', ['estagio_alterado', 'criado'])
        .gte('created_at', inicio.toISOString())
        .lte('created_at', fim.toISOString()),
    ])

  const fechamentos = ((eventos ?? []) as EventoComTeam[])
    .filter((e) => e.para_estagio && idsWon.has(e.para_estagio))
    .map((e) => ({
      teamId: e.team_id,
      valorDivida: e.lead?.valor_divida != null ? Number(e.lead.valor_divida) : null,
    }))

  return calcularComparativo(equipes ?? [], criados ?? [], agends ?? [], fechamentos)
}
