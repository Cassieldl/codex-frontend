import { ehColecao } from '../../../utils/ehColecao'

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

/**
 * Aplica {@link comEtagDeConcorrencia} a uma coleção que veio da API, exigindo que ela exista.
 *
 * Toda coleção lida por aqui é obrigatória no contrato. Quando uma delas não chega — servidor que
 * nunca enviou o campo, ou resposta lida no nível errado do envelope — a alternativa seria seguir
 * com lista vazia, e essa é a pior das duas: a tela perde o bloco sem dizer nada, e o defeito vive
 * até alguém reparar no que sumiu. Já aconteceu três vezes nesta base (`versoes`, `avisos`,
 * `campoLayoutNome`), e a ocorrência silenciosa foi sempre a que demorou a aparecer.
 *
 * Então falha, e nomeia o campo: o `queryFn` lança, a tela mostra erro de carregamento e o console
 * diz qual campo do contrato não veio — que é a informação que faltou das três vezes.
 */
export function comEtagDeConcorrenciaNaColecao<T extends ComVersaoConcorrencia>(
  colecao: readonly T[] | null | undefined,
  campo: string,
): (T & { etag: string })[] {
  if (!ehColecao(colecao))
    throw new Error(`A resposta da API não trouxe a coleção "${campo}", que o contrato exige.`)

  return colecao.map(comEtagDeConcorrencia)
}

interface ItemComEtag {
  id: number
  etag?: string
}

/** Etag do item na leitura atual da coleção, ou o da cópia quando ele não está mais nela. */
export function etagNaColecao(
  colecao: readonly ItemComEtag[] | undefined,
  item: ItemComEtag | null,
): string | undefined {
  if (!item) return undefined
  return colecao?.find((atual) => atual.id === item.id)?.etag ?? item.etag
}
