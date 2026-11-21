export type DirecaoDaOrdenacao = 'asc' | 'desc'

/** Ordenação enviada à API nos parâmetros `sortBy` e `sortDirection`. */
export interface OrdenacaoDeTabela<Campo extends string> {
  sortBy: Campo
  sortDirection: DirecaoDaOrdenacao
}

/** Coluna nova começa crescente; clicar de novo na mesma coluna inverte a direção. */
export function alternarOrdenacao<Campo extends string>(
  atual: OrdenacaoDeTabela<Campo> | null,
  campo: Campo,
): OrdenacaoDeTabela<Campo> {
  if (atual?.sortBy !== campo) return { sortBy: campo, sortDirection: 'asc' }

  return { sortBy: campo, sortDirection: atual.sortDirection === 'asc' ? 'desc' : 'asc' }
}
