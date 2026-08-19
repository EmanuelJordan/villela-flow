'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireContexto } from './_contexto'

/**
 * Administração de acessos — exclusiva do VP. As escritas usam service role
 * porque `papel`, `team_id` e `status` têm `revoke update` para authenticated
 * (0002): nem o VP altera essas colunas com o próprio token. A autorização é
 * feita AQUI, checando o papel de quem chama antes de tocar no admin client.
 */

const PAPEIS = ['franqueado', 'franqueado_gestor', 'vp'] as const

const membroSchema = z.object({
  userId: z.string().uuid(),
  papel: z.enum(PAPEIS),
  teamId: z.string().uuid(),
})

/** Contexto + trava de papel. Devolve null se quem chama não é VP. */
async function requireVp() {
  const ctx = await requireContexto()
  if (ctx.profile.papel !== 'vp') return null
  return ctx
}

const SEM_ACESSO = { ok: false as const, erro: 'Apenas a vice-presidência pode administrar acessos.' }

export async function atualizarMembro(input: z.input<typeof membroSchema>) {
  const parsed = membroSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, erro: parsed.error.issues[0].message }
  const ctx = await requireVp()
  if (!ctx) return SEM_ACESSO
  // anti-lockout: o VP é único — rebaixar a si mesmo deixaria o sistema sem administração
  if (parsed.data.userId === ctx.profile.id) {
    return { ok: false as const, erro: 'Você não pode alterar o próprio papel.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ papel: parsed.data.papel, team_id: parsed.data.teamId })
    .eq('id', parsed.data.userId)
  if (error) return { ok: false as const, erro: error.message }

  revalidatePath('/administracao')
  return { ok: true as const }
}

export async function aprovarMembro(input: z.input<typeof membroSchema>) {
  const parsed = membroSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, erro: parsed.error.issues[0].message }
  const ctx = await requireVp()
  if (!ctx) return SEM_ACESSO

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ status: 'approved', papel: parsed.data.papel, team_id: parsed.data.teamId })
    .eq('id', parsed.data.userId)
  if (error) return { ok: false as const, erro: error.message }

  revalidatePath('/administracao')
  return { ok: true as const }
}

export async function recusarMembro(userId: string) {
  if (!z.string().uuid().safeParse(userId).success) {
    return { ok: false as const, erro: 'Usuário inválido.' }
  }
  const ctx = await requireVp()
  if (!ctx) return SEM_ACESSO
  if (userId === ctx.profile.id) {
    return { ok: false as const, erro: 'Você não pode recusar a própria conta.' }
  }

  // apaga o usuário do Auth — o profile cai junto pelo on delete cascade
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { ok: false as const, erro: error.message }

  revalidatePath('/administracao')
  return { ok: true as const }
}

const nomeEquipeSchema = z.string().trim().min(2, 'Dê um nome à equipe').max(80)

export async function criarEquipe(nome: string) {
  const parsed = nomeEquipeSchema.safeParse(nome)
  if (!parsed.success) return { ok: false as const, erro: parsed.error.issues[0].message }
  const ctx = await requireVp()
  if (!ctx) return SEM_ACESSO

  const admin = createAdminClient()
  const { error } = await admin.from('teams').insert({ nome: parsed.data })
  if (error) return { ok: false as const, erro: error.message }

  revalidatePath('/administracao')
  return { ok: true as const }
}

export async function renomearEquipe(teamId: string, nome: string) {
  const parsed = nomeEquipeSchema.safeParse(nome)
  if (!parsed.success) return { ok: false as const, erro: parsed.error.issues[0].message }
  if (!z.string().uuid().safeParse(teamId).success) {
    return { ok: false as const, erro: 'Equipe inválida.' }
  }
  const ctx = await requireVp()
  if (!ctx) return SEM_ACESSO

  const admin = createAdminClient()
  const { error } = await admin.from('teams').update({ nome: parsed.data }).eq('id', teamId)
  if (error) return { ok: false as const, erro: error.message }

  revalidatePath('/administracao')
  return { ok: true as const }
}
