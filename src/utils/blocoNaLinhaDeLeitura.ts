export interface PosicaoDoBloco {
  raiz: string
  /** Distância do topo do bloco ao topo da janela, em px (negativa quando já passou). */
  topo: number
}

/**
 * Bloco em leitura: o que começa mais perto da linha de leitura sem passar dela. Antes do primeiro
 * bloco chegar à linha, vale o primeiro; sem bloco nenhum, `null`.
 */
export function blocoNaLinhaDeLeitura(
  posicoes: readonly PosicaoDoBloco[],
  linhaDeLeitura: number,
): string | null {
  if (posicoes.length === 0) return null

  const acimaDaLinha = posicoes.filter((posicao) => posicao.topo <= linhaDeLeitura)
  if (acimaDaLinha.length === 0) {
    return posicoes.reduce((primeiro, posicao) =>
      posicao.topo < primeiro.topo ? posicao : primeiro,
    ).raiz
  }

  return acimaDaLinha.reduce((maisPerto, posicao) =>
    posicao.topo > maisPerto.topo ? posicao : maisPerto,
  ).raiz
}
