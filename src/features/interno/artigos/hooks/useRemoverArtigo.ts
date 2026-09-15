import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { artigosAdminKeys } from './artigosAdminKeys'

interface VariaveisRemoverArtigo {
  id: number
  etag?: string
}

/**
 * `DELETE /interno/artigos/{id}` (I27) — role `artigos-remover`, `If-Match`
 * obrigatório, responde `204` sem corpo.
 *
 * Artigo reservado responde `422 ARTIGO_RESERVADO`, propagado sem tratamento
 * especial aqui: a página já desabilita a ação por `reservado`, e o `422` é a
 * rede de segurança do servidor, não o caminho esperado.
 */
export function useRemoverArtigo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, etag }: VariaveisRemoverArtigo) => {
      await apiInterno.delete(`/artigos/${id}`, { etag })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artigosAdminKeys.all })
    },
  })
}
