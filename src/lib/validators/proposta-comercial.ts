import { z } from 'zod'
import { VALIDADES_DIAS } from '@/lib/proposta-comercial/calculos'

/** Campo de texto do formulário: aparado, com teto, e '' contando como vazio.
 *  Mensagem explícita porque o default do zod sai em inglês e vai direto para o
 *  toast do assistente. */
const texto = (max: number) =>
  z.string().trim().max(max, `Máximo de ${max} caracteres`).optional().or(z.literal(''))

const NAO_NEGATIVO = 'Valor não pode ser negativo'

/** Número opcional vindo de input controlado: '' significa "não informado" —
 *  sem o preprocess, z.coerce transformaria '' em 0 e gravaria zero de mentira. */
const numeroOpcional = (schema: z.ZodNumber) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().pipe(schema).optional())

export const propostaComercialSchema = z
  .object({
    agendamento_id: z.string().uuid(),
    cliente: z.object({
      nomeCliente: texto(120),
      empresa: texto(160),
      cpfCnpj: texto(20),
      dataReuniao: texto(40),
      franqueado: texto(120),
      whatsappCloser: texto(20),
      telefoneEmpresa: texto(20),
      telefoneWhatsapp: texto(20),
    }),
    diagnostico: z.object({
      score: numeroOpcional(z.number().min(0, 'Score entre 0 e 1000').max(1000, 'Score entre 0 e 1000')),
      capitalRecuperavel: numeroOpcional(z.number().nonnegative(NAO_NEGATIVO)),
      dividaFiscal: numeroOpcional(z.number().nonnegative(NAO_NEGATIVO)),
      dividaBancaria: numeroOpcional(z.number().nonnegative(NAO_NEGATIVO)),
      dividaTrabalhista: numeroOpcional(z.number().nonnegative(NAO_NEGATIVO)),
    }),
    pgfn: z.object({
      valorDivida: numeroOpcional(z.number().nonnegative(NAO_NEGATIVO)),
      observacao: texto(280),
    }),
    valorTotalDivida: z.coerce.number().positive('Informe a dívida total'),
    reducaoPct: z.coerce.number().min(0, 'Redução entre 0 e 100%').max(100, 'Redução entre 0 e 100%'),
    previsao: z
      .object({
        divida6m: numeroOpcional(z.number().nonnegative(NAO_NEGATIVO)),
        divida12m: numeroOpcional(z.number().nonnegative(NAO_NEGATIVO)),
      })
      .default({}),
    precificacao: z.object({
      tituloEstrategia: z.string().trim().min(3, 'Dê um título à estratégia').max(120),
      valorEstrategia: z.coerce.number().positive('Informe o valor da estratégia'),
      descricaoEstrategia: texto(2000),
      qtdParcelas: z.coerce
        .number()
        .int('Parcelas em número inteiro')
        .min(1, 'Mínimo de 1 parcela')
        .max(36, 'Máximo de 36 parcelas'),
      valorEntrada: numeroOpcional(z.number().nonnegative(NAO_NEGATIVO)),
      validadeDias: z.coerce
        .number()
        .refine((v): v is (typeof VALIDADES_DIAS)[number] => (VALIDADES_DIAS as readonly number[]).includes(v), {
          message: 'Validade deve ser 1, 3, 5 ou 10 dias',
        }),
    }),
  })
  // Estratégia acima da dívida seria redução negativa — quase sempre é dígito trocado
  .refine((v) => v.precificacao.valorEstrategia <= v.valorTotalDivida, {
    message: 'A estratégia não pode custar mais que a dívida',
    path: ['precificacao', 'valorEstrategia'],
  })
  .refine((v) => (v.precificacao.valorEntrada ?? 0) < v.precificacao.valorEstrategia, {
    message: 'A entrada precisa ser menor que o valor da estratégia',
    path: ['precificacao', 'valorEntrada'],
  })

export type PropostaComercialInput = z.input<typeof propostaComercialSchema>
export type PropostaComercialValidada = z.output<typeof propostaComercialSchema>

/** Snapshot congelado gravado em `propostas.apresentacao`. A leitura é sempre
 *  via `safeParse`: jsonb antigo/estranho degrada para apresentação mínima em
 *  vez de derrubar a página pública. */
export const apresentacaoSchema = z.object({
  // v1 = snapshot original; v2 acrescenta `previsao` e `especialista`. Aceitamos
  // ambos: proposta antiga (v1) degrada com esses blocos vazios, não quebra.
  versao: z.union([z.literal(1), z.literal(2)]),
  cliente: z
    .object({
      nomeCliente: z.string(),
      empresa: z.string(),
      cpfCnpj: z.string(),
      dataReuniao: z.string(),
      franqueado: z.string(),
      whatsappCloser: z.string(),
      telefoneEmpresa: z.string(),
      telefoneWhatsapp: z.string(),
    })
    .partial()
    .default({}),
  diagnostico: z
    .object({
      score: z.number(),
      capitalRecuperavel: z.number(),
      dividaFiscal: z.number(),
      dividaBancaria: z.number(),
      dividaTrabalhista: z.number(),
    })
    .partial()
    .default({}),
  pgfn: z
    .object({
      valorDivida: z.number(),
      observacao: z.string(),
    })
    .partial()
    .default({}),
  simulacao: z
    .object({
      dividaOriginal: z.number(),
      reducaoPct: z.number(),
      reducao: z.number(),
      consolidado: z.number(),
    })
    .partial()
    .default({}),
  /** Previsão da dívida sem ação (página 2 do PDF). */
  previsao: z
    .object({
      aumento6m: z.number(),
      divida6m: z.number(),
      aumento12m: z.number(),
      divida12m: z.number(),
    })
    .partial()
    .default({}),
  /** Dados do closer/franqueado exibidos no topo do PDF. */
  especialista: z
    .object({
      nome: z.string(),
      email: z.string(),
      telefone: z.string(),
    })
    .partial()
    .default({}),
})

export type ApresentacaoProposta = z.infer<typeof apresentacaoSchema>
