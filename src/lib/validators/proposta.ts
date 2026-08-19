import { z } from 'zod'

export const propostaSchema = z
  .object({
    agendamento_id: z.string().uuid(),
    valor_total_divida: z.coerce.number().positive('Informe a dívida total'),
    valor_estrategia: z.coerce.number().positive('Informe o valor da estratégia'),
    espelhamento: z.coerce.boolean().optional().default(false),
    data_validade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a validade').optional(),
  })
  // Estratégia acima da dívida seria redução negativa — quase sempre é dígito trocado
  .refine((v) => v.valor_estrategia <= v.valor_total_divida, {
    message: 'A estratégia não pode custar mais que a dívida',
    path: ['valor_estrategia'],
  })

export type PropostaInput = z.infer<typeof propostaSchema>

export const pagamentoSchema = z.object({
  proposta_id: z.string().uuid(),
  valor_pago: z.coerce.number().positive('Informe o valor pago'),
  data_pagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data do pagamento'),
  metodo_pagamento: z.string().trim().max(40).optional().or(z.literal('')),
  descricao: z.string().trim().max(280).optional().or(z.literal('')),
})

export type PagamentoInput = z.infer<typeof pagamentoSchema>
