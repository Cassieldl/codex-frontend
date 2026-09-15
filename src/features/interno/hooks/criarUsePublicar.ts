import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { apiInterno } from '../../../services/apiInterno'

export interface PayloadPublicacao {
  id: number
  publicado: boolean
  etag?: string
}

interface EnvelopePublicacao<T> {
  data: T
  message: string | null
}

/**
 * Fábrica dos 6 hooks `usePublicar<Entidade>` (M19) — mesmo padrão de
 * endpoint em todas as entidades (`PUT .../publicacao`, `{ publicado }` +
 * `If-Match`, `analise-backend.md` §4.2 I3b/I9/I14d/I15d/I17c/I20c). Extraído
 * para não duplicar a mesma mutation 6 vezes.
 *
 * `chaveRaiz` é a `all` da keys factory da entidade (ex.: `provedoresAdminKeys.all`)
 * — invalidar pela raiz também invalida `detail(id)`/`lists()`, que são
 * sempre prefixados por ela, sem precisar conhecer a forma exata de cada
 * chave aqui dentro.
 */
export function criarUsePublicar<T>(rota: (id: number) => string, chaveRaiz: QueryKey) {
  return function usePublicar() {
    const queryClient = useQueryClient()

    return useMutation({
      mutationFn: async ({ id, publicado, etag }: PayloadPublicacao) => {
        const { data } = await apiInterno.put<EnvelopePublicacao<T>>(
          rota(id),
          { publicado },
          { etag },
        )
        return data.data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: chaveRaiz })
      },
    })
  }
}
