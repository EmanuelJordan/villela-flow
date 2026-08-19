import { describe, expect, it } from 'vitest'
import {
  escopoDoPapel,
  filtrosDoEscopo,
  normalizarPapel,
  pertenceAoEscopo,
  resolverVisao,
} from '@/lib/escopo'

const perfil = { id: 'user-1', papel: 'franqueado', team_id: 'team-a' }

describe('normalizarPapel', () => {
  it('papéis novos passam direto', () => {
    expect(normalizarPapel('franqueado')).toBe('franqueado')
    expect(normalizarPapel('franqueado_gestor')).toBe('franqueado_gestor')
    expect(normalizarPapel('vp')).toBe('vp')
  })
  it('nomes antigos do banco são aliases (janela de deploy)', () => {
    expect(normalizarPapel('sdr')).toBe('franqueado')
    expect(normalizarPapel('gerente')).toBe('franqueado_gestor')
  })
  it('desconhecido cai em franqueado (fail-safe)', () => {
    expect(normalizarPapel('hacker')).toBe('franqueado')
    expect(normalizarPapel('')).toBe('franqueado')
  })
})

describe('escopoDoPapel', () => {
  it('franqueado vê só o próprio trabalho', () => {
    expect(escopoDoPapel(perfil)).toEqual({
      tipo: 'proprio',
      ownerId: 'user-1',
      teamId: 'team-a',
    })
  })
  it('franqueado_gestor vê a equipe', () => {
    expect(escopoDoPapel({ ...perfil, papel: 'franqueado_gestor' })).toEqual({
      tipo: 'equipe',
      teamId: 'team-a',
    })
  })
  it('vp vê tudo', () => {
    expect(escopoDoPapel({ ...perfil, papel: 'vp' })).toEqual({ tipo: 'global' })
  })
  it('nomes antigos ainda resolvem (compat na janela de deploy)', () => {
    expect(escopoDoPapel({ ...perfil, papel: 'gerente' })).toEqual({
      tipo: 'equipe',
      teamId: 'team-a',
    })
    expect(escopoDoPapel({ ...perfil, papel: 'sdr' })).toEqual({
      tipo: 'proprio',
      ownerId: 'user-1',
      teamId: 'team-a',
    })
  })
  it('papel desconhecido cai no escopo próprio (fail-safe)', () => {
    expect(escopoDoPapel({ ...perfil, papel: 'hacker' })).toEqual({
      tipo: 'proprio',
      ownerId: 'user-1',
      teamId: 'team-a',
    })
  })
})

describe('filtrosDoEscopo', () => {
  it('próprio filtra por owner_id por padrão', () => {
    expect(filtrosDoEscopo({ tipo: 'proprio', ownerId: 'u1', teamId: 't1' })).toEqual({
      owner_id: 'u1',
    })
  })
  it('próprio aceita coluna de dono alternativa (lead_eventos usa actor_id)', () => {
    expect(
      filtrosDoEscopo(
        { tipo: 'proprio', ownerId: 'u1', teamId: 't1' },
        { colunaOwner: 'actor_id' },
      ),
    ).toEqual({ actor_id: 'u1' })
  })
  it('equipe filtra por team_id', () => {
    expect(filtrosDoEscopo({ tipo: 'equipe', teamId: 't1' })).toEqual({ team_id: 't1' })
  })
  it('global não filtra nada', () => {
    expect(filtrosDoEscopo({ tipo: 'global' })).toEqual({})
  })
})

describe('resolverVisao', () => {
  const TEAM_B = '11111111-2222-3333-4444-555555555555'
  const MEMBRO = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  const vp = { id: 'vp-1', papel: 'vp', team_id: 'team-a' }
  const gestor = { id: 'g-1', papel: 'franqueado_gestor', team_id: 'team-a' }
  const franqueado = { id: 'f-1', papel: 'franqueado', team_id: 'team-a' }

  it('vp: todos (ou nada) é global; equipe:<uuid> estreita para a equipe', () => {
    expect(resolverVisao(vp, undefined)).toEqual({ tipo: 'global' })
    expect(resolverVisao(vp, 'todos')).toEqual({ tipo: 'global' })
    expect(resolverVisao(vp, `equipe:${TEAM_B}`)).toEqual({ tipo: 'equipe', teamId: TEAM_B })
  })

  it('vp: sufixo malformado ou visão de gestor caem no global', () => {
    expect(resolverVisao(vp, 'equipe:nao-e-uuid')).toEqual({ tipo: 'global' })
    expect(resolverVisao(vp, 'meus')).toEqual({ tipo: 'global' })
    expect(resolverVisao(vp, `membro:${MEMBRO}`)).toEqual({ tipo: 'global' })
  })

  it('gestor: padrão é a equipe; meus e membro estreitam', () => {
    expect(resolverVisao(gestor, undefined)).toEqual({ tipo: 'equipe', teamId: 'team-a' })
    expect(resolverVisao(gestor, 'equipe')).toEqual({ tipo: 'equipe', teamId: 'team-a' })
    expect(resolverVisao(gestor, 'meus')).toEqual({
      tipo: 'proprio',
      ownerId: 'g-1',
      teamId: 'team-a',
    })
    expect(resolverVisao(gestor, `membro:${MEMBRO}`)).toEqual({
      tipo: 'proprio',
      ownerId: MEMBRO,
      teamId: 'team-a',
    })
  })

  it('gestor: malformado cai na equipe; uuid de outro time passa (o RLS zera as linhas)', () => {
    expect(resolverVisao(gestor, 'membro:hacker')).toEqual({ tipo: 'equipe', teamId: 'team-a' })
    expect(resolverVisao(gestor, 'todos')).toEqual({ tipo: 'equipe', teamId: 'team-a' })
    // membro de outro time resolve, mas as queries filtram owner + o RLS filtra team → vazio
    expect(resolverVisao(gestor, `membro:${MEMBRO}`).tipo).toBe('proprio')
  })

  it('franqueado (e papel desconhecido) ignora o cookie: sempre o próprio', () => {
    const proprio = { tipo: 'proprio', ownerId: 'f-1', teamId: 'team-a' }
    expect(resolverVisao(franqueado, 'todos')).toEqual(proprio)
    expect(resolverVisao(franqueado, `equipe:${TEAM_B}`)).toEqual(proprio)
    expect(resolverVisao({ ...franqueado, papel: 'hacker' }, 'todos')).toEqual(proprio)
  })
})

describe('pertenceAoEscopo', () => {
  const proprio = { tipo: 'proprio', ownerId: 'u1', teamId: 't1' } as const
  const equipe = { tipo: 'equipe', teamId: 't1' } as const

  it('próprio exige owner E team', () => {
    expect(pertenceAoEscopo({ team_id: 't1', owner_id: 'u1' }, proprio)).toBe(true)
    expect(pertenceAoEscopo({ team_id: 't1', owner_id: 'u2' }, proprio)).toBe(false)
    expect(pertenceAoEscopo({ team_id: 't2', owner_id: 'u1' }, proprio)).toBe(false)
  })
  it('próprio nega owner ausente (fail-safe)', () => {
    expect(pertenceAoEscopo({ team_id: 't1', owner_id: null }, proprio)).toBe(false)
    expect(pertenceAoEscopo({ team_id: 't1' }, proprio)).toBe(false)
  })
  it('equipe olha só o team', () => {
    expect(pertenceAoEscopo({ team_id: 't1', owner_id: 'u9' }, equipe)).toBe(true)
    expect(pertenceAoEscopo({ team_id: 't2', owner_id: 'u1' }, equipe)).toBe(false)
    expect(pertenceAoEscopo({ team_id: null }, equipe)).toBe(false)
  })
  it('global aceita tudo', () => {
    expect(pertenceAoEscopo({ team_id: null, owner_id: null }, { tipo: 'global' })).toBe(true)
  })
})
