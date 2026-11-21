export type OrigemErro = 'Prefeitura' | 'InvoiCy' | 'Schema'

export const ORIGENS_ERRO: readonly OrigemErro[] = ['Prefeitura', 'InvoiCy', 'Schema']

/** Colunas que `GET /interno/erros` aceita em `sortBy`. */
export type CampoDeOrdenacaoErro = 'codigo' | 'titulo' | 'origem' | 'publicado'

/** Item de `GET /interno/erros` (`ErroAdminListaItemDto`): só o que a tabela mostra, sem o agregado. */
export interface ErroAdminListaItem {
  id: number
  slug: string
  codigo: string
  origem: OrigemErro
  titulo: string
  publicado: boolean
  versaoConcorrencia: number
  etag?: string
}

/** `ErroAdminDetalheDto`: agregado com variantes e vínculos por id, base do modal de edição. */
export interface ErroAdminDetalhe extends ErroAdminListaItem {
  causaProvavel: string | null
  solucaoSugerida: string | null
  variantes: string[]
  versoesProvedorIds: number[]
  camposLayoutIds: number[]
}

/** `CriarErroDto`; a regra de `versoesProvedorIds` vazio vive no schema do `ErroForm`, como no backend. */
export interface ErroFormDto {
  codigo: string
  origem: OrigemErro
  titulo: string
  causaProvavel?: string
  solucaoSugerida?: string
  variantes: string[]
  versoesProvedorIds: number[]
  camposLayoutIds: number[]
}

/** `AtualizarErroDto`: sem `codigo`, que não muda depois de criado. */
export type AtualizarErroDto = Omit<ErroFormDto, 'codigo'>
