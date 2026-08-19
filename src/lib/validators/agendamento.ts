import { z } from 'zod'

export const agendamentoSchema = z
  .object({
    titulo: z.string().trim().min(2, 'Informe o título'),
    descricao: z.string().trim().optional().or(z.literal('')),
    inicio: z.coerce.date(),
    fim: z.coerce.date(),
    lead_id: z.string().uuid().optional(),
    criar_no_google: z.coerce.boolean().optional().default(false),
    // identidade do cliente quando o agendamento nasce sem lead (link do diagnóstico
    // colado direto na agenda) — é o que dá nome e valor ao card no Funil
    empresa: z.string().trim().max(160).optional(),
    cpf_cnpj: z.string().trim().max(20).optional(),
    valor_divida: z.number().nonnegative().optional(),
    // snapshot bruto do parser de diagnóstico (shape `DiagnosticoExtraido`). Fica
    // gravado em agendamentos.diagnostico_dados para o assistente de proposta
    // pré-preencher tudo depois — capital recuperável, dívidas segmentadas etc.
    diagnostico_dados: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((v) => v.fim > v.inicio, { message: 'O fim deve ser depois do início', path: ['fim'] })

export type AgendamentoInput = z.infer<typeof agendamentoSchema>

export const remarcarSchema = z
  .object({
    inicio: z.coerce.date(),
    fim: z.coerce.date(),
  })
  .refine((v) => v.fim > v.inicio, { message: 'O fim deve ser depois do início', path: ['fim'] })

export type RemarcarInput = z.infer<typeof remarcarSchema>
