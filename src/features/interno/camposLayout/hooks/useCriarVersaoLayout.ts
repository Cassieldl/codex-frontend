import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { CriarVersaoLayoutDto, VersaoLayoutAdmin } from '../types/versaoLayoutAdmin'
import { versoesLayoutKeys } from './versoesLayoutKeys'

interface EnvelopeVersaoLayoutAdmin {
  data: VersaoLayoutAdmin
  message: string | null
}

/** `POST /interno/layout/versoes` (I15b) — sem `ordem` (auto-atribuída) e sem `publicado`. */
export function useCriarVersaoLayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: CriarVersaoLayoutDto) => {
      const { data } = await apiInterno.post<EnvelopeVersaoLayoutAdmin>('/layout/versoes', dto)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: versoesLayoutKeys.lists() })
    },
  })
}
