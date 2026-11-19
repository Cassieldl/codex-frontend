import type { BlocoDoLayout } from '../../../utils/blocosDoLayout'

export interface VizinhosDoBloco {
  anterior: string | null
  proximo: string | null
}

/**
 * Bloco que o dicionário mostra quando exibe um por vez. O campo aberto no modal manda (a linha
 * dele precisa estar na tela para a navegação e a volta do foco); depois vale o bloco escolhido na
 * lateral; sem escolha válida, o primeiro.
 */
export function raizDoBlocoVisivel(
  raizes: readonly string[],
  raizEscolhida: string | null,
  raizDoCampoAberto: string | null,
): string | null {
  if (raizDoCampoAberto !== null && raizes.includes(raizDoCampoAberto)) return raizDoCampoAberto
  if (raizEscolhida !== null && raizes.includes(raizEscolhida)) return raizEscolhida
  return raizes[0] ?? null
}

/** Blocos antes e depois do atual, para o rodapé "anterior / próximo". */
export function vizinhosDoBloco(raizes: readonly string[], raiz: string | null): VizinhosDoBloco {
  const indice = raiz === null ? -1 : raizes.indexOf(raiz)
  if (indice < 0) return { anterior: null, proximo: null }

  return {
    anterior: raizes[indice - 1] ?? null,
    proximo: raizes[indice + 1] ?? null,
  }
}

/** Campos novos nesta versão em cada bloco, sem filtro: o "+N" da lateral. */
export function contarNovosPorBloco<TCampo extends { novoNestaVersao: boolean }>(
  blocos: readonly BlocoDoLayout<TCampo>[],
): Map<string, number> {
  return new Map(
    blocos.map((bloco) => [
      bloco.raiz,
      bloco.subgrupos.reduce(
        (soma, subgrupo) => soma + subgrupo.campos.filter((campo) => campo.novoNestaVersao).length,
        0,
      ),
    ]),
  )
}
