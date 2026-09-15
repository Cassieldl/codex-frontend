/**
 * Marca a origem de um link copiado pela barra de comando interna (§9.3/PQ-10)
 * — usada só para o suporte identificar, em telemetria futura, que o link
 * veio do atendimento. Nunca vai para o backend, `<link rel="canonical">` nem
 * sitemap: `origem` é lido pelo `validateSearch` das rotas públicas e
 * descartado silenciosamente pela aplicação, só para não ser removido pelo
 * router (era esse o bug de PQ-10 — o router apagava o parâmetro da URL).
 */
export const ORIGENS_LINK = { atendimento: 'atendimento' } as const

export type OrigemLink = (typeof ORIGENS_LINK)[keyof typeof ORIGENS_LINK]

export function comOrigem(caminho: string, origem: OrigemLink): string {
  const separador = caminho.includes('?') ? '&' : '?'
  return `${caminho}${separador}origem=${origem}`
}
