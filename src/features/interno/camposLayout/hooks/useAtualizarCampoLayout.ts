import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { AtualizarCampoLayoutDto, CampoLayoutAdmin } from '../types/campoLayoutAdmin'
import { camposLayoutKeys } from './camposLayoutKeys'

interface EnvelopeCampoLayoutAdmin {
  data: CampoLayoutAdmin
  message: string | null
}

interface VariaveisAtualizarCampoLayout {
  id: number
  versaoLayoutId: number
  dto: AtualizarCampoLayoutDto
  etag?: string
}

/**
 * `PUT /interno/campos-layout/{id}` (I17a) — role `campolayout-atualizar`,
 * `If-Match` obrigatório. `versaoLayoutDescontinuadoId` obrigatório se
 * `estado === 'Descontinuado'`, proibido caso contrário — validado no
 * `CampoLayoutForm`, espelhando o validator do backend (§5.1b).
 */
export function useAtualizarCampoLayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, dto, etag }: VariaveisAtualizarCampoLayout) => {
      const { data } = await apiInterno.put<EnvelopeCampoLayoutAdmin>(`/campos-layout/${id}`, dto, {
        etag,
      })
      return data.data
    },
    onSuccess: (_dados, variaveis) => {
      queryClient.invalidateQueries({
        queryKey: camposLayoutKeys.porVersaoLayout(variaveis.versaoLayoutId),
      })
    },
  })
}
