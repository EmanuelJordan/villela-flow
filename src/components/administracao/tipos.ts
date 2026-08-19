/** Linhas que a página de administração distribui aos componentes. */
export interface MembroAdmin {
  id: string
  nome: string
  email: string
  papel: string
  status: string
  team_id: string | null
  created_at: string
}

export interface EquipeAdmin {
  id: string
  nome: string
  created_at: string
}

/** Papéis atribuíveis pela administração (VP não é atribuível — é único). */
export const PAPEIS_ATRIBUIVEIS = [
  { valor: 'franqueado', rotulo: 'Franqueado' },
  { valor: 'franqueado_gestor', rotulo: 'Franqueado Gestor' },
] as const

export const ROTULO_PAPEL_ADMIN: Record<string, string> = {
  franqueado: 'Franqueado',
  franqueado_gestor: 'Franqueado Gestor',
  vp: 'VP',
  // nomes antigos podem aparecer até a migration rodar
  sdr: 'Franqueado',
  gerente: 'Franqueado Gestor',
}
