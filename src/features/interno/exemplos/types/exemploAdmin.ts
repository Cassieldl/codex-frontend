/**
 * Item de `GET /interno/versoes/{id}/exemplos` (I38) e resposta de I39/I40/I41.
 *
 * O `etag` é derivado do `versaoConcorrencia` do CORPO (`comEtagDeConcorrencia`):
 * a listagem é uma coleção, e o header `ETag` só existe uma vez por resposta -
 * sem essa derivação o `If-Match` obrigatório de I41/I42 não teria origem.
 */
export interface ExemploAdmin {
  id: number
  versaoProvedorId: number
  slug: string
  nome: string
  descricao: string | null
  xml: string
  versaoConcorrencia: number
  etag?: string
}

/**
 * `CriarExemploDto` (I39) - `slug` NUNCA no body: é derivado do `nome` pelo
 * backend, com sufixo determinístico quando dois nomes normalizam igual.
 */
export interface CriarExemploDto {
  nome: string
  descricao?: string
  xml: string
}

/**
 * `AtualizarExemploDto` (I41) - mesmo formato, e também sem `slug`: renomear um
 * exemplo nunca recalcula o slug, senão a âncora `#exemplo-{slug}` já copiada
 * por alguém deixaria de resolver.
 */
export interface AtualizarExemploDto {
  nome: string
  descricao?: string
  xml: string
}
