import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { AtualizarVersaoDto, VersaoAdminDetalhe } from '../types/versaoAdmin'
import { versoesAdminKeys } from './versoesAdminKeys'

interface EnvelopeVersaoAdminDetalhe {
  data: VersaoAdminDetalhe
  message: string | null
}

interface VariaveisAtualizarVersao {
  id: number
  provedorId: number
  dto: AtualizarVersaoDto
  etag?: string
}

/** `PUT /interno/versoes/{id}` (I8b) — role `versoesprovedor-atualizar`, `If-Match` obrigatório. */
export function useAtualizarVersaoProvedor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, dto, etag }: VariaveisAtualizarVersao) => {
      const { data } = await apiInterno.put<EnvelopeVersaoAdminDetalhe>(`/versoes/${id}`, dto, {
        etag,
      })
      return data.data
    },
    onSuccess: (_dados, variaveis) => {
      void queryClient.invalidateQueries({ queryKey: versoesAdminKeys.detail(variaveis.id) })
      void queryClient.invalidateQueries({
        queryKey: versoesAdminKeys.porProvedor(variaveis.provedorId),
      })
    },
  })
}
