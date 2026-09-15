import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { errosAdminKeys } from './errosAdminKeys'

interface VariaveisRemoverErro {
  id: number
  etag?: string
}

/** `DELETE /interno/erros/{id}` (I20b) — role `erros-remover`, `If-Match` obrigatório. */
export function useRemoverErro() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, etag }: VariaveisRemoverErro) => {
      await apiInterno.delete(`/erros/${id}`, { etag })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: errosAdminKeys.lists() })
    },
  })
}
