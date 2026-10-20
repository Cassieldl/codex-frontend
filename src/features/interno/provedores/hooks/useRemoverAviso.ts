import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'

interface VariaveisRemoverAviso {
  id: number
  etag?: string
}

/** `DELETE /interno/avisos/{id}` (I14c) — role `avisos-remover`, `If-Match` obrigatório. */
export function useRemoverAviso(chaveParaInvalidar: QueryKey) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, etag }: VariaveisRemoverAviso) => {
      await apiInterno.delete(`/avisos/${id}`, { etag })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaveParaInvalidar })
    },
  })
}
