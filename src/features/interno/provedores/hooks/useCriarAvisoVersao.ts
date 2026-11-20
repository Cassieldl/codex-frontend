import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { AvisoAdmin, CriarAvisoDeVersaoDto } from '../types/avisoAdmin'
import { versoesAdminKeys } from './versoesAdminKeys'

interface EnvelopeAvisoAdmin {
  data: AvisoAdmin
  message: string | null
}

/**
 * `POST /interno/versoes/{id}/avisos` (I14a) - escopo **versão**, aceita
 * `campoVersaoIds`. Escopo é implícito na rota - o formulário nunca tem um
 * seletor "provedor ou versão" (§5.7).
 */
export function useCriarAvisoVersao(versaoId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: CriarAvisoDeVersaoDto) => {
      const { data } = await apiInterno.post<EnvelopeAvisoAdmin>(`/versoes/${versaoId}/avisos`, dto)
      return data.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: versoesAdminKeys.detail(versaoId) })
    },
  })
}
