import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { CampoVersaoAdmin, CriarCampoVersaoDto } from '../types/campoVersaoAdmin'
import { camposVersaoKeys } from './camposVersaoKeys'

interface EnvelopeCampoVersaoAdmin {
  data: CampoVersaoAdmin
  message: string | null
}

/**
 * `POST /interno/versoes/{id}/campos` (I12) — role `camposversao-adicionar`.
 * `422` quando a contagem já está em 2000 (M22, cap) — propagado como
 * `AxiosError`, tratado pela página (toast, sem mensagem genérica).
 */
export function useCriarCampoVersao(versaoId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: CriarCampoVersaoDto) => {
      const { data } = await apiInterno.post<EnvelopeCampoVersaoAdmin>(
        `/versoes/${versaoId}/campos`,
        dto,
      )
      return data.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: camposVersaoKeys.all })
    },
  })
}
