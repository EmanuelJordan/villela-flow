/**
 * Escopo de visão por papel — aplicado na camada de aplicação em conjunto com
 * o RLS por equipe (migration 0006): o banco garante que nada cruza equipes;
 * estes filtros refinam o recorte dentro do time e dão mensagens claras.
 *
 * franqueado → só o próprio trabalho · franqueado_gestor → a equipe · vp → tudo.
 * Papel desconhecido cai no escopo próprio (fail-safe: nunca amplia visão).
 *
 * A distinção owner-dentro-do-time é responsabilidade da aplicação (o RLS
 * segrega por equipe, não por dono) — daí `pertenceAoEscopo` nas mutações.
 */
export type Papel = 'franqueado' | 'franqueado_gestor' | 'vp'

export type Escopo =
  | { tipo: 'proprio'; ownerId: string; teamId: string }
  | { tipo: 'equipe'; teamId: string }
  | { tipo: 'global' }

/** Slug canônico do papel, aceitando os nomes antigos do banco.
 *  Default fail-safe: papel desconhecido é tratado como franqueado. */
export function normalizarPapel(papel: string): Papel {
  switch (papel) {
    case 'vp':
      return 'vp'
    case 'franqueado_gestor':
    case 'gerente': // compat: nome antigo durante a janela de deploy
      return 'franqueado_gestor'
    default:
      return 'franqueado'
  }
}

export function escopoDoPapel(profile: {
  id: string
  papel: string
  team_id: string
}): Escopo {
  switch (normalizarPapel(profile.papel)) {
    case 'vp':
      return { tipo: 'global' }
    case 'franqueado_gestor':
      return { tipo: 'equipe', teamId: profile.team_id }
    default:
      return { tipo: 'proprio', ownerId: profile.id, teamId: profile.team_id }
  }
}

/** Filtros de igualdade para `.match()` do supabase-js. */
export function filtrosDoEscopo(
  escopo: Escopo,
  opts?: { colunaOwner?: string },
): Record<string, string> {
  switch (escopo.tipo) {
    case 'proprio':
      return { [opts?.colunaOwner ?? 'owner_id']: escopo.ownerId }
    case 'equipe':
      return { team_id: escopo.teamId }
    case 'global':
      return {}
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Resolve a visão escolhida no seletor do header (cookie `visao`) dentro do
 *  máximo que o papel permite — a seleção só ESTREITA, nunca amplia:
 *  vp: 'todos' | 'equipe:<teamId>' · gestor: 'equipe' | 'meus' | 'membro:<id>'.
 *  Valor ausente/malformado cai no padrão do papel. Um membro/equipe de outro
 *  time passa aqui, mas o RLS por equipe devolve zero linhas — tela vazia,
 *  nunca dado alheio. Visão é leitura: as mutações seguem `escopoDoPapel`. */
export function resolverVisao(
  profile: { id: string; papel: string; team_id: string },
  visao: string | undefined,
): Escopo {
  const papel = normalizarPapel(profile.papel)

  if (papel === 'vp') {
    const teamId = visao?.startsWith('equipe:') ? visao.slice('equipe:'.length) : null
    if (teamId && UUID.test(teamId)) return { tipo: 'equipe', teamId }
    return { tipo: 'global' }
  }

  if (papel === 'franqueado_gestor') {
    if (visao === 'meus') return { tipo: 'proprio', ownerId: profile.id, teamId: profile.team_id }
    const membroId = visao?.startsWith('membro:') ? visao.slice('membro:'.length) : null
    if (membroId && UUID.test(membroId)) {
      return { tipo: 'proprio', ownerId: membroId, teamId: profile.team_id }
    }
    return { tipo: 'equipe', teamId: profile.team_id }
  }

  // franqueado (e papel desconhecido) não escolhe: sempre a própria carteira
  return { tipo: 'proprio', ownerId: profile.id, teamId: profile.team_id }
}

/** A linha (lead, agendamento, proposta…) está ao alcance deste escopo?
 *  Usada nas mutações e nas buscas por id: o RLS barra outros times, isto
 *  barra o franqueado mexendo no dado do colega — com erro claro em vez de
 *  "0 linhas afetadas". Owner ausente no escopo próprio nega (fail-safe). */
export function pertenceAoEscopo(
  row: { team_id: string | null; owner_id?: string | null },
  escopo: Escopo,
): boolean {
  switch (escopo.tipo) {
    case 'proprio':
      return row.owner_id === escopo.ownerId && row.team_id === escopo.teamId
    case 'equipe':
      return row.team_id === escopo.teamId
    case 'global':
      return true
  }
}
