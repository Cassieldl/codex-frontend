// Espelha `arquitetura.md` §4.1 (P10/P11/P12).

export type EstadoVersaoLayout = 'Prevista' | 'Vigente' | 'Anterior'

export interface LayoutVersaoResumo {
  slug: string
  rotulo: string
  estado: EstadoVersaoLayout
  ordem: number
  totalCampos: number
}

export interface LayoutIndice {
  vigente: LayoutVersaoResumo | null
  /** Já ordenado por `ordem` DESC pelo backend — o frontend nunca reordena. */
  versoes: LayoutVersaoResumo[]
}

export interface CampoLayoutPublico {
  slug: string
  nome: string
  caminhoXml: string
  significado: string
  ordem: number
  novoNestaVersao: boolean
  descontinuadoNestaVersao: boolean
  /** "/layout/campos/{slug}" — fonte única do link estável do campo (A3). */
  urlCanonica: string
}

export interface GrupoCamposLayout {
  grupo: string | null
  grupoSlug: string | null
  campos: CampoLayoutPublico[]
}

export interface LayoutVersaoPagina {
  // `descricao` é IRMÃ de `versao`, não aninhada: o `LayoutVersaoDto` do backend tem as duas no
  // mesmo nível, e `LayoutVersaoResumoDto` não carrega o campo — ele é reusado em `anterior`,
  // `versaoExibicao`, `versaoOrigem` e no índice, onde uma nota de versão não faria sentido.
  versao: LayoutVersaoResumo
  descricao: string | null
  anterior: LayoutVersaoResumo | null
  totalCampos: number
  camposPorGrupo: GrupoCamposLayout[]
}

/** Resposta de P12 — usada só para decidir o redirect (A3); `ondeEUsado` não é renderizado (F-2). */
export interface CampoLayoutVerbete {
  slug: string
  nome: string
  caminhoXml: string
  significado: string
  estado: 'Ativo' | 'Descontinuado'
  versaoExibicao: { slug: string; rotulo: string }
  versaoOrigem: { slug: string; rotulo: string }
  versaoDescontinuado: { slug: string; rotulo: string } | null
  ondeEUsado: {
    provedorSlug: string
    provedorNome: string
    versaoSlug: string
    versaoRotulo: string
  }[]
}
