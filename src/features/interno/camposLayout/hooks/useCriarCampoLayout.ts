import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { CampoLayoutAdmin, CriarCampoLayoutDto } from '../types/campoLayoutAdmin'
import { camposLayoutKeys } from './camposLayoutKeys'

interface EnvelopeCampoLayoutAdmin {
  data: CampoLayoutAdmin
  message: string | null
}

/** `POST /interno/layout/versoes/{id}/campos` (I16) — sem `publicado`. */
export function useCriarCampoLayout(versaoLayoutId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: CriarCampoLayoutDto) => {
      const { data } = await apiInterno.post<EnvelopeCampoLayoutAdmin>(
        `/layout/versoes/${versaoLayoutId}/campos`,
        dto,
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: camposLayoutKeys.porVersaoLayout(versaoLayoutId),
      })
    },
  })
}
