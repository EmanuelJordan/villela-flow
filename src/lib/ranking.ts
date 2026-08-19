/**
 * Agregações puras para o dashboard de gestor (ranking por vendedor) e de
 * VP (comparativo por equipe). Fechamentos são atribuídos ao owner do lead
 * (não ao actor do evento) — quem carrega a carteira leva o crédito.
 */

export type LinhaRanking = {
  ownerId: string
  nome: string
  leads: number
  agendamentos: number
  fechamentos: number
  valorFechado: number
}

export function calcularRanking(
  vendedores: { id: string; nome: string }[],
  leadsCriados: { owner_id: string | null }[],
  agendamentos: { owner_id: string | null }[],
  fechamentos: { ownerId: string | null; valorDivida: number | null }[],
): LinhaRanking[] {
  const linhas = vendedores.map((v) => ({
    ownerId: v.id,
    nome: v.nome,
    leads: leadsCriados.filter((l) => l.owner_id === v.id).length,
    agendamentos: agendamentos.filter((a) => a.owner_id === v.id).length,
    fechamentos: fechamentos.filter((f) => f.ownerId === v.id).length,
    valorFechado: fechamentos
      .filter((f) => f.ownerId === v.id)
      .reduce((soma, f) => soma + (f.valorDivida ?? 0), 0),
  }))
  return linhas.sort(
    (a, b) => b.valorFechado - a.valorFechado || b.fechamentos - a.fechamentos || b.leads - a.leads,
  )
}

export type LinhaEquipe = {
  teamId: string
  nome: string
  leads: number
  agendamentos: number
  fechamentos: number
  valorFechado: number
  taxaConversao: number
}

export function calcularComparativo(
  equipes: { id: string; nome: string }[],
  leadsCriados: { team_id: string }[],
  agendamentos: { team_id: string }[],
  fechamentos: { teamId: string; valorDivida: number | null }[],
): LinhaEquipe[] {
  const linhas = equipes.map((e) => {
    const leads = leadsCriados.filter((l) => l.team_id === e.id).length
    const fechados = fechamentos.filter((f) => f.teamId === e.id)
    return {
      teamId: e.id,
      nome: e.nome,
      leads,
      agendamentos: agendamentos.filter((a) => a.team_id === e.id).length,
      fechamentos: fechados.length,
      valorFechado: fechados.reduce((soma, f) => soma + (f.valorDivida ?? 0), 0),
      taxaConversao: leads > 0 ? Math.round((fechados.length / leads) * 100) : 0,
    }
  })
  return linhas.sort(
    (a, b) => b.valorFechado - a.valorFechado || b.fechamentos - a.fechamentos || b.leads - a.leads,
  )
}
