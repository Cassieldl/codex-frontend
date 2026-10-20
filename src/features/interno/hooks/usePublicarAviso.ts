import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { apiInterno } from '../../../services/apiInterno'
import type { AvisoAdmin } from '../provedores/types/avisoAdmin'
import type { PayloadPublicacao } from './criarUsePublicar'

interface EnvelopeAvisoAdmin {
  data: AvisoAdmin
  message: string | null
}

/**
 * `PUT /interno/avisos/{id}/publicacao`, role `avisos-publicar`. Aviso não tem query própria: vive
 * dentro do detalhe do provedor ou da versão, então quem chama passa a chave desse detalhe, de onde
 * saem o rótulo do botão e o `etag` da próxima ação.
 */
export function usePublicarAviso(chaveParaInvalidar: QueryKey) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, publicado, etag }: PayloadPublicacao) => {
      const { data } = await apiInterno.put<EnvelopeAvisoAdmin>(
        `/avisos/${id}/publicacao`,
        { publicado },
        { etag },
      )
      return data.data
    },
    // Também no erro: depois de um 409 o detalhe relido traz o etag novo, e a próxima tentativa passa.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chaveParaInvalidar })
    },
  })
}
