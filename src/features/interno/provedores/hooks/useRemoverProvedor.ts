import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { provedoresAdminKeys } from './provedoresAdminKeys'

interface VariaveisRemoverProvedor {
  id: number
  etag?: string
}

/** `DELETE /interno/provedores/{id}` (I5) — role `provedores-remover`, `If-Match` obrigatório. */
export function useRemoverProvedor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, etag }: VariaveisRemoverProvedor) => {
      await apiInterno.delete(`/provedores/${id}`, { etag })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: provedoresAdminKeys.lists() })
    },
  })
}
