import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { CriarVersaoDto, VersaoAdminDetalhe } from '../types/versaoAdmin'
import { versoesAdminKeys } from './versoesAdminKeys'

interface EnvelopeVersaoAdminDetalhe {
  data: VersaoAdminDetalhe
  message: string | null
}

/** `POST /interno/provedores/{id}/versoes` (I7) - role `versoesprovedor-adicionar`. */
export function useCriarVersaoProvedor(provedorId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: CriarVersaoDto) => {
      const { data } = await apiInterno.post<EnvelopeVersaoAdminDetalhe>(
        `/provedores/${provedorId}/versoes`,
        dto,
      )
      return data.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: versoesAdminKeys.porProvedor(provedorId) })
    },
  })
}
