import type { AvisoAdmin } from './avisoAdmin'

export type CategoriaProvedor = 'Nacional' | 'Proprio'

/**
 * `GET /interno/provedores` (I1) — item de `PaginatedResponse<T>`. Como a
 * resposta é uma lista, o `xmin` de cada linha viaja embutido no próprio item
 * (`versaoConcorrencia`, sempre presente em `ProvedorAdminListaItemDto`) —
 * nunca via header, que só existe uma vez por resposta — para permitir
 * publicar/despublicar direto da lista sem round-trip de detalhe. O `etag` é
 * derivado desse valor pelo hook de leitura (`comEtagDeConcorrencia`).
 */
export interface ProvedorAdminListaItem {
  id: number
  nome: string
  categoria: CategoriaProvedor
  identificadorInvoicy: string
  publicado: boolean
  versaoConcorrencia: number
  etag?: string
}

/**
 * `GET /interno/provedores/{id}` (I2) — inclui **todos** os avisos de
 * provedor (publicados e rascunho), `analise-backend.md` §4.2. O `etag` é
 * anexado pelo hook de leitura a partir do header `ETag`, com o
 * `versaoConcorrencia` do corpo como fonte canônica de reserva (M9,
 * `rules/api.md`) — nunca de outra origem.
 */
export interface ProvedorAdminDetalhe {
  id: number
  nome: string
  categoria: CategoriaProvedor
  identificadorInvoicy: string
  aliases: string[]
  publicado: boolean
  avisos: AvisoAdmin[]
  versaoConcorrencia: number
  etag?: string
}

/** `CriarProvedorDto` (I3) — sem `publicado` (nasce sempre em rascunho). */
export interface CriarProvedorDto {
  nome: string
  identificadorInvoicy: string
  categoria: CategoriaProvedor
  aliases: string[]
}

/** `AtualizarProvedorDto` (I4) — sem `publicado` (endpoint dedicado, I3b). */
export interface AtualizarProvedorDto {
  nome: string
  categoria: CategoriaProvedor
  aliases: string[]
}
