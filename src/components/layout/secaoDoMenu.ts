const SECOES_DO_MENU = ['provedores', 'layout', 'artigos', 'como-funciona'] as const

export type SecaoDoMenu = (typeof SECOES_DO_MENU)[number]

/**
 * Seção do menu do topo a que o caminho pertence, pelo primeiro segmento: `/provedores/x/campos`
 * é Provedores. Fora das quatro seções, nenhuma fica marcada.
 */
export function secaoDoCaminho(caminho: string): SecaoDoMenu | null {
  const primeiroSegmento = caminho.split('/')[1] ?? ''

  return SECOES_DO_MENU.find((secao) => secao === primeiroSegmento) ?? null
}
