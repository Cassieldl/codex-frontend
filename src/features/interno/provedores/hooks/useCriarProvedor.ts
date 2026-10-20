import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { CriarProvedorDto, ProvedorAdminDetalhe } from '../types/provedorAdmin'
import { provedoresAdminKeys } from './provedoresAdminKeys'

interface EnvelopeProvedorAdminDetalhe {
  data: ProvedorAdminDetalhe
  message: string | null
}

/** `POST /interno/provedores` (I3) — role `provedores-adicionar`, nasce sempre em rascunho. */
export function useCriarProvedor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: CriarProvedorDto) => {
      const { data } = await apiInterno.post<EnvelopeProvedorAdminDetalhe>('/provedores', dto)
      return data.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: provedoresAdminKeys.lists() })
    },
  })
}
