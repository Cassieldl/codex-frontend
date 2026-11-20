/**
 * Chaves de cache do Layout InvoiCy público (P10/P11/P12).
 *
 * Não usa `criarFabricaDeChaves`: nenhum dos três endpoints é listagem
 * paginada/parametrizada (`/layout` é um índice único, os outros dois são
 * detalhes por slug), então `lists()`/`list(params)` nasceriam mortos.
 */
const raiz = ['layout'] as const

export const layoutKeys = {
  all: raiz,
  /** P10: `GET /layout`. */
  indice: () => [...raiz, 'indice'] as const,
  /** P11: `GET /layout/versoes/{slug}`. Cada versão é uma entrada própria. */
  versao: (versaoSlug: string) => [...raiz, 'versao', versaoSlug] as const,
  /** P12: `GET /layout/campos/{slug}`: resolução do redirect (A3) e usos no modal do campo. */
  campo: (campoSlug: string) => [...raiz, 'campo', campoSlug] as const,
  /** `GET /layout/versoes/{slug}/estrutura`: árvore XML e JSON da versão. */
  estrutura: (versaoSlug: string) => [...raiz, 'estrutura', versaoSlug] as const,
}
