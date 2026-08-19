export interface DiagnosticoExtraido {
  nomeCliente?: string
  empresa?: string
  cpfCnpj?: string
  telefone?: string
  email?: string
  valorDivida?: number
  qtdInscricoes?: number
  orgao?: string
  /** Resumo pronto para colar na descrição de uma reunião. Só o parser sabe quais
   *  campos importam e em que ordem, então ele monta o texto. */
  resumo?: string
  detalhes?: Record<string, unknown>
}

export interface ResultadoExtracao {
  sucesso: boolean
  dados?: DiagnosticoExtraido
  erro?: string
  fonte: 'stub' | 'villela-v1'
}

export interface DiagnosticoParser {
  suporta(url: string): boolean
  extrair(url: string): Promise<ResultadoExtracao>
}
