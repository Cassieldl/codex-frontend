const raiz = ['exemplosAdmin'] as const

/**
 * Keys factory de `exemplos` (área interna). Só há listagem por versão: I38
 * devolve a coleção completa, sem paginação - o cap é de 10 exemplos por versão
 * (C3), e paginar um conjunto com esse teto seria custo sem retorno.
 */
export const exemplosAdminKeys = {
  porVersao: (versaoId: number) => [...raiz, 'porVersao', versaoId] as const,
}
