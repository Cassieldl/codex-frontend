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
 * Fábrica dos hooks `usePublicar<Entidade>` das entidades com keys factory própria: mesmo
 * endpoint em todas (`PUT .../publicacao`, `{ publicado }` + `If-Match`). O de aviso fica fora
 * porque aviso não tem query própria e invalida o detalhe do pai (`usePublicarAviso`).
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
