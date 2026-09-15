import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { versoesAdminKeys } from './versoesAdminKeys'

interface VariaveisRemoverVersao {
  id: number
  provedorId: number
  etag?: string
}

/** `DELETE /interno/versoes/{id}` (I8c) — role `versoesprovedor-remover`, `If-Match` obrigatório. */
export function useRemoverVersaoProvedor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, etag }: VariaveisRemoverVersao) => {
      await apiInterno.delete(`/versoes/${id}`, { etag })
    },
    onSuccess: (_dados, variaveis) => {
      queryClient.invalidateQueries({
        queryKey: versoesAdminKeys.porProvedor(variaveis.provedorId),
      })
    },
  })
}
