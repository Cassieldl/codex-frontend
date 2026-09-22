import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { versoesAdminKeys } from '../../provedores/hooks/versoesAdminKeys'
import { exemplosAdminKeys } from './exemplosAdminKeys'

export interface VariaveisRemoverExemplo {
  id: number
  versaoId: number
  etag?: string
}

/**
 * `DELETE /interno/exemplos/{id}` (I42) — role `exemplos-remover`, `If-Match`
 * obrigatório, `204` sem corpo. Invalida a lista e o detalhe da versão pai pelo
 * mesmo motivo de I39/I41 (C5).
 */
export function useRemoverExemplo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, etag }: VariaveisRemoverExemplo) => {
      await apiInterno.delete(`/exemplos/${id}`, { etag })
    },
    onSuccess: (_dados, variaveis) => {
      queryClient.invalidateQueries({ queryKey: exemplosAdminKeys.porVersao(variaveis.versaoId) })
      queryClient.invalidateQueries({ queryKey: versoesAdminKeys.detail(variaveis.versaoId) })
    },
  })
}
