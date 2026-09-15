/**
 * Base da keys factory por entidade (`analise-frontend.md` §5.3). Cada
 * feature cria seu próprio `<entidade>Keys.ts` estendendo o resultado desta
 * função com as chaves específicas da entidade (`detail`, `versao`, etc.) —
 * nunca hooks de `useQuery`/`useMutation` inline em página.
 *
 * Exemplo:
 * ```ts
 * // features/provedores/hooks/provedoresKeys.ts
 * const base = criarFabricaDeChaves<ListarProvedoresParams>('provedores')
 *
 * export const provedoresKeys = {
 *   ...base,
 *   detail: (slug: string) => [...base.all, 'detail', slug] as const,
 * }
 * ```
 */
export function criarFabricaDeChaves<TListParams>(entidade: string) {
  const all = [entidade] as const

  return {
    all,
    lists: () => [...all, 'list'] as const,
    list: (params: TListParams) => [...all, 'list', params] as const,
  }
}
