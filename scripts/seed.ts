/**
 * Seed de dados artificiais para a demo — 3 equipes com perfis de performance
 * distintos (para os comparativos de gestor/VP renderem bem).
 *   npx tsx scripts/seed.ts          # cria (idempotente por e-mail)
 *   npx tsx scripts/seed.ts --reset  # apaga tudo e recria
 */
import { fakerPT_BR as faker } from '@faker-js/faker'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { addDays, subDays } from 'date-fns'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
if (!url || !secret) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY em .env.local')
  process.exit(1)
}
const admin = createClient(url, secret, { auth: { persistSession: false } })

faker.seed(42) // demo reproduzível

const SENHA_DEMO = 'villela-demo-2026'

type Equipe = {
  nome: string
  usuarios: { email: string; nome: string; papel: 'franqueado_gestor' | 'franqueado' }[]
  /** distribuição de leads por estágio — dá o "perfil" da equipe */
  distribuicao: [string, number][]
  /** faixa de valor_divida da equipe */
  valor: { min: number; max: number }
}

// O VP pertence à Matriz no banco (team_id NOT NULL nas actions),
// mas o papel 'vp' dá visão global na Home.
const VP = { email: 'vp@demo.villela', nome: 'Helena Villela', papel: 'vp' as const }

const EQUIPES: Equipe[] = [
  {
    nome: 'Villela Matriz',
    usuarios: [
      { email: 'gerente@demo.villela', nome: 'Paulo Vilela', papel: 'franqueado_gestor' },
      { email: 'sdr1@demo.villela', nome: 'Camila Rocha', papel: 'franqueado' },
      { email: 'sdr2@demo.villela', nome: 'Diego Martins', papel: 'franqueado' },
      { email: 'sdr3@demo.villela', nome: 'Larissa Nunes', papel: 'franqueado' },
      { email: 'sdr4@demo.villela', nome: 'Rafael Costa', papel: 'franqueado' },
    ],
    // equipe madura: funil equilibrado, conversão boa
    distribuicao: [
      ['Novo Lead', 9],
      ['Contato Feito', 8],
      ['Agendado', 7],
      ['Proposta Enviada', 6],
      ['Fechado', 6],
      ['Perdido', 4],
    ],
    valor: { min: 15_000, max: 2_000_000 },
  },
  {
    nome: 'Villela Campinas',
    usuarios: [
      { email: 'gerente2@demo.villela', nome: 'Marina Duarte', papel: 'franqueado_gestor' },
      { email: 'sdr5@demo.villela', nome: 'Bruno Carvalho', papel: 'franqueado' },
      { email: 'sdr6@demo.villela', nome: 'Aline Ferreira', papel: 'franqueado' },
      { email: 'sdr7@demo.villela', nome: 'Tiago Souza', papel: 'franqueado' },
      { email: 'sdr8@demo.villela', nome: 'Patrícia Lima', papel: 'franqueado' },
    ],
    // muito volume no topo, conversão baixa
    distribuicao: [
      ['Novo Lead', 11],
      ['Contato Feito', 9],
      ['Agendado', 5],
      ['Proposta Enviada', 3],
      ['Fechado', 1],
      ['Perdido', 1],
    ],
    valor: { min: 10_000, max: 500_000 },
  },
  {
    nome: 'Villela Litoral',
    usuarios: [
      { email: 'gerente3@demo.villela', nome: 'Ricardo Menezes', papel: 'franqueado_gestor' },
      { email: 'sdr9@demo.villela', nome: 'Fernanda Alves', papel: 'franqueado' },
      { email: 'sdr10@demo.villela', nome: 'Gustavo Pereira', papel: 'franqueado' },
      { email: 'sdr11@demo.villela', nome: 'Juliana Santos', papel: 'franqueado' },
      { email: 'sdr12@demo.villela', nome: 'Eduardo Ramos', papel: 'franqueado' },
    ],
    // pequena e eficiente: pouco volume, muito fechamento
    distribuicao: [
      ['Novo Lead', 3],
      ['Contato Feito', 3],
      ['Agendado', 4],
      ['Proposta Enviada', 3],
      ['Fechado', 5],
      ['Perdido', 2],
    ],
    valor: { min: 50_000, max: 3_000_000 },
  },
]

// pesos dos 4 franqueados dentro da equipe (ranking com hierarquia visível)
const PESOS_FRANQUEADO = [4, 3, 2, 1]

const ESTAGIOS = [
  { nome: 'Novo Lead', ordem: 1, cor: '#00BCE5', is_won: false, is_lost: false },
  { nome: 'Contato Feito', ordem: 2, cor: '#3CB5C9', is_won: false, is_lost: false },
  { nome: 'Agendado', ordem: 3, cor: '#55C2E6', is_won: false, is_lost: false },
  { nome: 'Proposta Enviada', ordem: 4, cor: '#116780', is_won: false, is_lost: false },
  { nome: 'Fechado', ordem: 5, cor: '#16a34a', is_won: true, is_lost: false },
  { nome: 'Perdido', ordem: 6, cor: '#94a3b8', is_won: false, is_lost: true },
]

async function reset() {
  console.log('— reset: apagando dados…')
  // ordem importa: filhos antes dos pais
  for (const tabela of [
    'fechamento_pagamentos',
    'propostas',
    'lead_eventos',
    'followups',
    'agendamentos',
    'leads',
    'funil_estagios',
  ]) {
    const { error } = await admin.from(tabela).delete().not('id', 'is', null)
    if (error) console.warn(`  aviso ${tabela}: ${error.message}`)
  }
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  for (const u of data?.users ?? []) {
    if (u.email?.endsWith('@demo.villela')) await admin.auth.admin.deleteUser(u.id)
  }
  await admin.from('teams').delete().not('id', 'is', null)
}

async function garantirUsuario(
  email: string,
  nome: string,
  existentes: { id: string; email?: string | null }[],
): Promise<string> {
  const jaExiste = existentes.find((e) => e.email === email)
  if (jaExiste) return jaExiste.id
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SENHA_DEMO,
    email_confirm: true,
    user_metadata: { nome },
  })
  if (error) throw error
  return data.user.id
}

async function main() {
  if (process.argv.includes('--reset')) await reset()

  // teams (por nome, idempotente)
  const teamIds: Record<string, string> = {}
  for (const equipe of EQUIPES) {
    const { data: existente } = await admin
      .from('teams')
      .select('id')
      .eq('nome', equipe.nome)
      .maybeSingle()
    if (existente) {
      teamIds[equipe.nome] = existente.id
    } else {
      const r = await admin.from('teams').insert({ nome: equipe.nome }).select('id').single()
      teamIds[equipe.nome] = r.data!.id
    }
  }
  const matrizId = teamIds['Villela Matriz']
  console.log('teams:', Object.keys(teamIds).length)

  // usuários (o trigger cria o profile; depois ajustamos papel/team/nome)
  const { data: existentesData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existentes = existentesData?.users ?? []
  const userIds: Record<string, string> = {}

  // status explícito: desde a 0006 o default de contas novas é 'pending' —
  // sem isto um --reset deixaria o demo inteiro trancado na aprovação
  userIds[VP.email] = await garantirUsuario(VP.email, VP.nome, existentes)
  await admin
    .from('profiles')
    .update({ papel: VP.papel, team_id: matrizId, nome: VP.nome, status: 'approved' })
    .eq('id', userIds[VP.email])

  for (const equipe of EQUIPES) {
    for (const u of equipe.usuarios) {
      userIds[u.email] = await garantirUsuario(u.email, u.nome, existentes)
      await admin
        .from('profiles')
        .update({ papel: u.papel, team_id: teamIds[equipe.nome], nome: u.nome, status: 'approved' })
        .eq('id', userIds[u.email])
    }
  }
  console.log('usuários:', Object.keys(userIds).length, `(senha: ${SENHA_DEMO})`)

  // estágios do funil — conjunto único compartilhado pelas equipes na demo
  // (o Funil e as métricas consultam funil_estagios sem filtro de team)
  let { data: estagios } = await admin.from('funil_estagios').select('*')
  if (!estagios || estagios.length === 0) {
    const r = await admin
      .from('funil_estagios')
      .insert(ESTAGIOS.map((e) => ({ ...e, team_id: matrizId })))
      .select('*')
    estagios = r.data
  }
  const porNome = new Map(estagios!.map((e) => [e.nome, e]))

  if ((await admin.from('leads').select('id', { count: 'exact', head: true })).count) {
    console.log('leads já existem — use --reset para recriar. Fim.')
    return
  }

  const agora = new Date()
  let posicao = 0
  let totalLeads = 0
  // contador global: dá variedade determinística aos desfechos do funil
  let nAgendamento = 0

  for (const equipe of EQUIPES) {
    const teamId = teamIds[equipe.nome]
    const franqueados = equipe.usuarios.filter((u) => u.papel === 'franqueado').map((u) => userIds[u.email])
    // pool ponderado: sdr melhor ranqueado recebe mais leads
    const pool = franqueados.flatMap((id, i) => Array<string>(PESOS_FRANQUEADO[i] ?? 1).fill(id))
    let leadsDaEquipe = 0

    for (const [nomeEstagio, qtd] of equipe.distribuicao) {
      const estagio = porNome.get(nomeEstagio)!
      for (let i = 0; i < qtd; i++) {
        const owner = pool[(posicao + i) % pool.length]
        const criadoEm = subDays(agora, faker.number.int({ min: 3, max: 60 }))
        const { data: lead } = await admin
          .from('leads')
          .insert({
            team_id: teamId,
            owner_id: owner,
            estagio_id: estagio.id,
            posicao: posicao++,
            nome_cliente: faker.person.fullName(),
            empresa: faker.company.name(),
            cpf_cnpj: faker.string.numeric(14),
            telefone: faker.phone.number(),
            email: faker.internet.email().toLowerCase(),
            valor_divida: faker.number.int(equipe.valor),
            origem: faker.helpers.arrayElement([
              'Indicação',
              'Site',
              'Prospecção ativa',
              'Parceiro',
            ]),
            link_diagnostico: `https://diagnostico.suaempresa.com.br/r/${faker.string.alphanumeric(8)}`,
            diagnostico_status: 'extraido',
            created_at: criadoEm.toISOString(),
          })
          .select('id')
          .single()
        if (!lead) continue
        leadsDaEquipe++

        // trilha de eventos: criado + mudanças até o estágio atual
        // (leads Perdidos NÃO passam por Fechado — senão inflam a métrica de fechamentos)
        const trilha = ESTAGIOS.slice(
          0,
          ESTAGIOS.findIndex((e) => e.nome === nomeEstagio) + 1,
        ).filter((e) => !e.is_won || e.nome === nomeEstagio)
        let quando = criadoEm
        await admin.from('lead_eventos').insert({
          team_id: teamId,
          lead_id: lead.id,
          actor_id: owner,
          tipo: 'criado',
          para_estagio: porNome.get('Novo Lead')!.id,
          created_at: quando.toISOString(),
        })
        for (let t = 1; t < trilha.length; t++) {
          quando = addDays(quando, faker.number.int({ min: 1, max: 7 }))
          // clamp em vez de break: o estágio atual do lead sempre tem evento na timeline
          if (quando > agora) quando = agora
          await admin.from('lead_eventos').insert({
            team_id: teamId,
            lead_id: lead.id,
            actor_id: owner,
            tipo: 'estagio_alterado',
            de_estagio: porNome.get(trilha[t - 1].nome)!.id,
            para_estagio: porNome.get(trilha[t].nome)!.id,
            created_at: quando.toISOString(),
          })
        }

        // follow-ups: alguns vencidos, alguns futuros
        if (posicao % 3 === 0) {
          const vencido = posicao % 6 === 0
          await admin.from('followups').insert({
            team_id: teamId,
            lead_id: lead.id,
            owner_id: owner,
            descricao: faker.helpers.arrayElement([
              'Ligar para retorno',
              'Enviar proposta revisada',
              'Cobrar documentação',
              'Confirmar reunião',
            ]),
            vence_em: (vencido
              ? subDays(agora, faker.number.int({ min: 1, max: 5 }))
              : addDays(agora, faker.number.int({ min: 0, max: 5 }))
            ).toISOString(),
          })
        }

        // agendamentos — cada um vira um card do Funil Unificado. O estágio do lead
        // decide até onde o card chega no fluxo (agenda → proposta → contrato).
        if (['Agendado', 'Proposta Enviada', 'Fechado'].includes(nomeEstagio)) {
          const empresa = faker.company.name().toUpperCase()
          const cnpj = faker.string.numeric(14)
          const divida = faker.number.int(equipe.valor)
          nAgendamento++

          // 'Agendado' ainda está na agenda; os outros dois já tiveram a reunião
          const futuro = nomeEstagio === 'Agendado' && nAgendamento % 5 < 2
          const naoCompareceu = nomeEstagio === 'Agendado' && nAgendamento % 5 === 2
          // A maioria dentro do mês corrente, e um terço bem recente — sem isso as
          // colunas de Proposta e Contrato ficam vazias nos filtros Hoje e Semana.
          const recente = nAgendamento % 3 === 0
          const inicio = futuro
            ? addDays(agora, faker.number.int({ min: 0, max: 6 }))
            : subDays(agora, faker.number.int({ min: 1, max: recente ? 4 : 18 }))
          inicio.setHours(faker.number.int({ min: 9, max: 17 }), 0, 0, 0)
          const fim = new Date(inicio.getTime() + 60 * 60 * 1000)

          const { data: ag } = await admin
            .from('agendamentos')
            .insert({
              team_id: teamId,
              lead_id: lead.id,
              owner_id: owner,
              titulo: `Reunião — ${empresa}`,
              empresa,
              cpf_cnpj: cnpj,
              valor_divida: divida,
              inicio: inicio.toISOString(),
              fim: fim.toISOString(),
              status: futuro ? 'agendado' : naoCompareceu ? 'nao_compareceu' : 'realizado',
              meet_link: futuro ? 'https://meet.google.com/demo-link-fake' : null,
              created_at: subDays(inicio, 2).toISOString(),
              // sem isto o default `now()` faz todo card parecer mexido hoje, e o
              // filtro de período do Funil devolve o mesmo total em Hoje/Semana/Mês
              updated_at: subDays(inicio, 2).toISOString(),
            })
            .select('id')
            .single()
          await admin.from('lead_eventos').insert({
            team_id: teamId,
            lead_id: lead.id,
            actor_id: owner,
            tipo: 'agendamento_criado',
            created_at: subDays(inicio, 2).toISOString(),
          })

          if (ag && nomeEstagio !== 'Agendado') {
            const fechado = nomeEstagio === 'Fechado'
            // estratégia custa entre 25% e 55% da dívida — é a redução que se vende
            const estrategia = Math.round(divida * faker.number.float({ min: 0.25, max: 0.55 }))
            // uma proposta de cada seis vence em ≤2 dias, para o selo de urgência aparecer
            const validadeEmDias = nAgendamento % 6 === 0 ? faker.number.int({ min: 0, max: 2 }) : faker.number.int({ min: 5, max: 25 })
            const propostaEm = addDays(inicio, 1)

            const { data: prop } = await admin
              .from('propostas')
              .insert({
                team_id: teamId,
                agendamento_id: ag.id,
                lead_id: lead.id,
                owner_id: owner,
                valor_total_divida: divida,
                valor_estrategia: estrategia,
                espelhamento: nAgendamento % 2 === 0,
                data_validade: addDays(agora, validadeEmDias).toISOString().slice(0, 10),
                enviada_em: propostaEm.toISOString(),
                contrato_status: fechado ? 'assinado' : nAgendamento % 7 === 0 ? 'enviado' : 'nenhum',
                created_at: propostaEm.toISOString(),
                updated_at: propostaEm.toISOString(),
              })
              .select('id')
              .single()

            // fechado quase sempre é fechado pago; o resto fica em Contratos não pagos
            if (prop && fechado && nAgendamento % 10 !== 0) {
              const pagoEm = addDays(propostaEm, faker.number.int({ min: 1, max: 6 }))
              await admin.from('fechamento_pagamentos').insert({
                team_id: teamId,
                proposta_id: prop.id,
                valor_pago: estrategia,
                data_pagamento: (pagoEm > agora ? agora : pagoEm).toISOString().slice(0, 10),
                metodo_pagamento: faker.helpers.arrayElement(['PIX', 'Boleto', 'Transferência']),
                created_at: (pagoEm > agora ? agora : pagoEm).toISOString(),
              })
            }
          }
        }
      }
    }
    totalLeads += leadsDaEquipe
    console.log(`  ${equipe.nome}: ${leadsDaEquipe} leads`)
  }

  console.log(`seed concluído: ${totalLeads} leads em ${EQUIPES.length} equipes.`)
  console.log(`logins demo (senha ${SENHA_DEMO}):`)
  console.log('  vp@demo.villela (vice-presidência) · gerente@/gerente2@/gerente3@ (franqueados gestores)')
  console.log('  sdr1..4 (Matriz) · sdr5..8 (Campinas) · sdr9..12 (Litoral) — todos franqueados')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
