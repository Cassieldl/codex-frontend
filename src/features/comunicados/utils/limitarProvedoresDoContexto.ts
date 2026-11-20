/** Teto de provedores por consulta imposto pelo servidor (`400 PARAMETRO_INVALIDO` acima disso). */
export const MAXIMO_PROVEDORES_POR_CONSULTA = 10

/**
 * Slugs distintos, na ordem de chegada, até o teto do servidor. A página do erro lista versões, e
 * várias delas podem ser do mesmo provedor - repetir o slug gastaria o teto à toa.
 */
export function limitarProvedoresDoContexto(provedorSlugs: readonly string[]): string[] {
  return [...new Set(provedorSlugs)].slice(0, MAXIMO_PROVEDORES_POR_CONSULTA)
}
