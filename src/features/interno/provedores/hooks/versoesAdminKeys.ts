/**
 * Keys factory de `versoesprovedor` (área interna). Raiz própria (não estende
 * `provedoresAdminKeys`) — publicar/atualizar uma versão invalida só o que é
 * dela; a página de detalhe do provedor refaz o fetch da lista de versões
 * (`porProvedor`) por conta própria quando necessário.
 */
export const versoesAdminKeys = {
  all: ['versoesProvedorAdmin'] as const,
  porProvedor: (provedorId: number) => ['versoesProvedorAdmin', 'porProvedor', provedorId] as const,
  detail: (versaoId: number) => ['versoesProvedorAdmin', 'detail', versaoId] as const,
}
