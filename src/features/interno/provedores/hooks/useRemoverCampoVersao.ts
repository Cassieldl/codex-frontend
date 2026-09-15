import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { camposVersaoKeys } from './camposVersaoKeys'

interface VariaveisRemoverCampoVersao {
  id: number
  etag?: string
}

/** `DELETE /interno/campos-versao/{id}` (I13b) — role `camposversao-remover`, `If-Match` obrigatório. */
export function useRemoverCampoVersao() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, etag }: VariaveisRemoverCampoVersao) => {
      await apiInterno.delete(`/campos-versao/${id}`, { etag })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: camposVersaoKeys.all })
    },
  })
}
