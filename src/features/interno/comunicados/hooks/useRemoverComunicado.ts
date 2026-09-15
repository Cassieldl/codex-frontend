import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comunicadosAdminKeys } from './comunicadosAdminKeys'

interface VariaveisRemoverComunicado {
  id: number
  etag?: string
}

/**
 * `DELETE /interno/comunicados/{id}` (I34) — role `comunicados-remover`,
 * `If-Match` obrigatório, responde `204` sem corpo.
 */
export function useRemoverComunicado() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, etag }: VariaveisRemoverComunicado) => {
      await apiInterno.delete(`/comunicados/${id}`, { etag })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comunicadosAdminKeys.all })
    },
  })
}
