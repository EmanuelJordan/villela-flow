'use server'

import { extrairDiagnostico } from '@/lib/diagnostico/parser'
import type { ResultadoExtracao } from '@/lib/diagnostico/types'
import { requireContexto } from './_contexto'

export async function executarExtracao(url: string): Promise<ResultadoExtracao> {
  await requireContexto() // só autenticados extraem
  return extrairDiagnostico(url)
}
