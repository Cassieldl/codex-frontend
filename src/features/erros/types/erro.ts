// Espelha `analise-backend.md` §4.1 (P5/P6) e `analise-frontend.md` §5.4/§7.2.
// `ErroDetalhe.versoesAplicaveis` é **array vazio**, nunca `null`/omitido,
// quando o erro não tem provedor/versão aplicável (U9) - a API já garante
// isso no DTO, o frontend só respeita o shape.

import type { TipoArtigo } from '../../artigos/types/artigo'

export type OrigemErro = 'Prefeitura' | 'InvoiCy' | 'Schema'

export interface VersaoAplicavel {
  provedorSlug: string
  provedorNome: string
  versaoSlug: string
  versaoRotulo: string
}

/** Versão de provedor em que o campo aparece - é para a âncora dele que o link aponta. */
export interface AncoraCampoVersao {
  provedorSlug: string
  versaoSlug: string
}

export interface CampoRelacionado {
  slug: string
  nome: string
  caminhoXml: string
  ancoras: AncoraCampoVersao[]
}

/** Artigo ligado a um erro (P6, §1.5). `url` já vem pronta do backend (`/artigos/{slug}`). */
export interface ReferenciaArtigo {
  rotulo: 'ARTIGO'
  slug: string
  tipo: TipoArtigo
  titulo: string
  url: string
}

export interface ErroDetalhe {
  slug: string
  codigo: string
  origem: OrigemErro
  titulo: string
  variantes: string[]
  causaProvavel: string | null
  solucaoSugerida: string | null
  /** Lista vazia é válida - erro geral de origem `InvoiCy`/`Schema` (U9). */
  versoesAplicaveis: VersaoAplicavel[]
  camposRelacionados: CampoRelacionado[]
  /** Sempre presente - `[]` quando não há artigo ligado, nunca omitido nem `null` (PQ-08). */
  artigosRelacionados: ReferenciaArtigo[]
}

export interface ErroListaItem {
  slug: string
  codigo: string
  titulo: string
  origem: OrigemErro
  /** `null` quando o erro é geral (U9), nunca travessão. */
  provedorNome: string | null
}
