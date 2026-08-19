/** Estado do formulário do assistente de proposta. Números viajam como string
 *  (inputs controlados, mesmo padrão dos dialogs do funil); quem converte e
 *  valida é o `propostaComercialSchema` na server action. */
export interface PropostaComercialForm {
  cliente: {
    nomeCliente: string
    empresa: string
    cpfCnpj: string
    /** ISO do início da reunião — só exibida, não editável. */
    dataReuniao: string
    franqueado: string
    whatsappCloser: string
    telefoneEmpresa: string
    telefoneWhatsapp: string
  }
  diagnostico: {
    score: string
    capitalRecuperavel: string
    dividaFiscal: string
    dividaBancaria: string
    dividaTrabalhista: string
  }
  pgfn: {
    valorDivida: string
    observacao: string
  }
  /** "Dívida Original" da simulação — o único número obrigatório da etapa 1. */
  valorTotalDivida: string
  /** Redução prevista da dívida (%), editável — alimenta a simulação. */
  reducaoPct: string
  /** Previsão da dívida "se nada for feito" — pré-calculada (+15% / +32% da
   *  dívida total) mas editável, como o capital recuperável. */
  previsao: {
    divida6m: string
    divida12m: string
  }
  precificacao: {
    tituloEstrategia: string
    valorEstrategia: string
    descricaoEstrategia: string
    qtdParcelas: string
    temEntrada: boolean
    valorEntrada: string
    validadeDias: number
  }
}
