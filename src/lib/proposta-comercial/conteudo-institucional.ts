/** Conteúdo institucional fixo do PDF (páginas "Somos Referência", pilares e
 *  chamada final). Igual para toda proposta — editar aqui atualiza o material.
 *  Números e textos transcritos do material comercial da Villela. */

export const INSTITUCIONAL = {
  headline: 'SOMOS REFERÊNCIA',
  descricao:
    'Com mais de 20 anos de mercado, o Grupo Villela é uma das instituições mais experientes na recuperação de empresas no país. Somos referência em todos os segmentos, de A a Z, de Norte a Sul.',
  /** Marcas atendidas exibidas como selos. */
  clientes: [
    'AVON',
    'Estrela',
    'oBoticário',
    'Mormaii',
    'Nestlé',
    'BAND',
    'Santa Casa',
    'Albert Einstein',
    'SPFC',
    'Cruzeiro',
  ],
  especialidades: [
    'Renegociação bancária',
    'Regularização fiscal',
    'Recuperação empresarial',
    'Alavancagem financeira',
  ],
  /** Números institucionais (rótulo + valor em destaque). */
  numeros: [
    { valor: '21', rotulo: 'Anos de mercado' },
    { valor: '2.500', rotulo: 'Colaboradores e franqueados' },
    { valor: 'R$ 80 Bi', rotulo: 'Em valores recuperados' },
    { valor: '140 Mil', rotulo: 'Empresas recuperadas' },
    { valor: '90', rotulo: 'Unidades em todo o Brasil' },
  ],
} as const

/** Os 3 pilares da metodologia ("Faremos o simples"). */
export const PILARES = [
  {
    titulo: 'Auditoria',
    itens: [
      'Auditoria completa dos débitos',
      'Auditamos a dívida, não a empresa',
      'Descobrimos o valor real da dívida',
      'Anulamos juros e multas indevidas',
    ],
    selo: 'Reduzimos a dívida',
    seloDetalhe: 'Acima de 50% fiscal · Até 90% bancárias',
  },
  {
    titulo: 'Defesa',
    itens: [
      'Monitoramento processual',
      'Alarmes processuais',
      'Notificação de movimentações',
      'Defesas em execuções atuais e futuras',
    ],
    selo: 'Defesa em tempo real',
    seloDetalhe: 'Tudo dentro do aplicativo',
  },
  {
    titulo: 'Parcelamento',
    itens: [
      'Volume institucional',
      'Líder em parcelamentos no Brasil',
      '+5 milhões homologados/dia',
      '+200 parcelamentos por dia',
    ],
    selo: 'Volume institucional',
    seloDetalhe: 'A maior plataforma de renegociação do Brasil',
  },
] as const

/** Bullets do comparativo de soluções (página 4). O da estratégia recebe a
 *  redução e o teto de parcelas em runtime. */
export const CONTRAS_CONVENCIONAL = [
  'Entrada obrigatória de 20%',
  'Parcelas elevadas',
  'Sem redução da dívida',
  'Sem auditoria jurídica',
  'Sem revisão de multas',
  'Sem revisão de juros',
] as const

export const PROS_ESTRATEGIA = [
  'Sem entrada inicial',
  'Auditoria jurídica completa',
  'Revisão de juros e multas',
  'Proteção contra bloqueios',
] as const

/** Chamada final (última página). */
export const CHAMADA_FINAL = {
  titulo: 'Dê a oportunidade para sua empresa',
  texto:
    'Adquira a Estratégia Villela de gestão e recuperação. Traga fôlego financeiro, segurança e proteção para o seu negócio.',
  assinatura: 'Grupo Villela',
  tagline: 'A gigante brasileira cuidando da sua empresa',
  site: 'grupovillela.com.br/capital-recuperado',
  rodape: 'De mãos dadas com o futuro.',
} as const
