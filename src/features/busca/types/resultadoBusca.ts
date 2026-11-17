// Espelha `ResultadoBuscaDto` do backend, envelopado em `ApiResponse<ResultadoBusca>`.
// Serve à busca pública (`apiPublico`) e à interna (`features/interno/busca`).

export type QualidadeBusca = 'exata' | 'parcial' | 'aproximada' | 'vazia'

/** Valores de `TipoItemIndexado` no backend, minúsculos como persistidos no índice. */
export type TipoResultado =
  'erro' | 'provedor' | 'versaoprovedor' | 'campolayout' | 'aviso' | 'artigo'

export interface TrechoResultado {
  texto: string
  destacado: boolean
}

/** Metadado estruturado do item: o frontend formata para português no ponto de uso. */
export interface MetaVerificacaoResultado {
  tipo: 'verificacao'
  data: string
}

export type MetaResultado = MetaVerificacaoResultado

/** Cada token que a autocorreção trocou, como em `BuscaTokenCorrecaoDto`. */
export interface TokenCorrecao {
  de: string
  para: string
  similaridade: number
}

export interface CorrecaoBusca {
  termoOriginal: string
  termoCorrigido: string
  tokens: TokenCorrecao[]
}

/** Parte do erro onde o termo casou. O cartão já mostra código, mensagem e solução. */
export type CampoCasado = 'codigo' | 'mensagem' | 'causa' | 'solucao' | 'outro'

export interface ResultadoItem {
  tipo: string
  rotulo: string
  chave: string | null
  titulo: string
  url: string
  /** `null` para erro geral, sem provedor nem versão aplicável. Ver `ResultadoErroGeral`. */
  provedorNome: string | null
  versaoRotulo: string | null
  versoes: string[] | null
  /** Ex.: "casou com o código E-124". Termo de quem construiu a busca: a busca pública não mostra. */
  descricaoCasamento: string
  /** Parte do erro onde o termo casou; `null` nos outros tipos. Vem sempre no JSON. */
  campoCasado: CampoCasado | null
  /** Primeira linha da solução, só para erro; `null` nos outros tipos e no erro sem solução. */
  solucaoResumo: string | null
  /** Sempre `true` na busca pública; na interna, revela o rascunho. */
  publicado: boolean
  meta: MetaResultado | null
  pontuacao: number
  /** Fragmentos estruturados, nunca HTML. Renderizado por `TrechosDestacados`. */
  trechos: TrechoResultado[]
}

export interface GrupoResultado {
  tipo: TipoResultado
  rotulo: string
  total: number
  pontuacao: number
  itens: ResultadoItem[]
}

export interface ForaDoFiltro {
  total: number
  tipos: string[]
}

export interface FiltroProvedor {
  slug: string
  nome: string
}

export interface ResultadoBusca {
  termo: string
  termoUsado: string
  correcao: CorrecaoBusca | null
  qualidade: QualidadeBusca
  totalGeral: number
  /** Já vem ordenado por `pontuacao`: o frontend nunca reordena. */
  grupos: GrupoResultado[]
  foraDoFiltro: ForaDoFiltro | null
  filtroProvedor: FiltroProvedor | null
}
