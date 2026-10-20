import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { camposLayoutKeys } from './camposLayoutKeys'

interface VariaveisRemoverCampoLayout {
  id: number
  versaoLayoutId: number
  etag?: string
}

/** `DELETE /interno/campos-layout/{id}` (I17b) — role `campolayout-remover`, `If-Match` obrigatório. */
export function useRemoverCampoLayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, etag }: VariaveisRemoverCampoLayout) => {
      await apiInterno.delete(`/campos-layout/${id}`, { etag })
    },
    onSuccess: (_dados, variaveis) => {
      void queryClient.invalidateQueries({
        queryKey: camposLayoutKeys.porVersaoLayout(variaveis.versaoLayoutId),
      })
    },
  })
}
