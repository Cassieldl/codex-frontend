export type FiltroDePublicacao = 'todos' | 'publicados' | 'rascunhos'

export const FILTROS_DE_PUBLICACAO: readonly FiltroDePublicacao[] = [
  'todos',
  'publicados',
  'rascunhos',
]

export const ROTULO_DO_FILTRO_DE_PUBLICACAO: Record<FiltroDePublicacao, string> = {
  todos: 'Todos',
  publicados: 'Publicados',
  rascunhos: 'Rascunhos',
}

/** Valor do parâmetro `publicado`: ausente traz rascunho e publicado juntos. */
export function publicadoDoFiltro(filtro: FiltroDePublicacao): boolean | undefined {
  if (filtro === 'publicados') return true
  if (filtro === 'rascunhos') return false
  return undefined
}
