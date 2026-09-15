/** Recurso da área interna que carrega o validador de concorrência otimista no corpo. */
export interface ComVersaoConcorrencia {
  versaoConcorrencia: number
}

/**
 * Formato único da ETag fraca de concorrência — idêntico ao que o backend emite
 * no header `ETag` (`IfMatchExtensoes.FormatarETagConcorrencia`) e aceita de
 * volta em `If-Match` (`IfMatchExtensoes.ExigirIfMatch`).
 */
export function formatarEtagConcorrencia(versaoConcorrencia: number): string {
  return `W/"${versaoConcorrencia}"`
}

/**
 * Deriva o `etag` de um recurso a partir do `versaoConcorrencia` que vem no
 * CORPO da resposta.
 *
 * O corpo é a fonte canônica do validador: o header `ETag` é um por resposta,
 * então não alcança item de lista nem coleção aninhada. Sem esta derivação, os
 * hooks de mutação não têm de onde tirar o `If-Match` que o backend exige em
 * todo `PUT`/`DELETE` interno — e toda escrita responde `400`.
 */
export function comEtagDeConcorrencia<T extends ComVersaoConcorrencia>(
  recurso: T,
): T & { etag: string } {
  return { ...recurso, etag: formatarEtagConcorrencia(recurso.versaoConcorrencia) }
}
