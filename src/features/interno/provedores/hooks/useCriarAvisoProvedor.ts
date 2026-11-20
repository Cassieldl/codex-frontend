import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { AvisoAdmin, CriarAvisoDeProvedorDto } from '../types/avisoAdmin'
import { provedoresAdminKeys } from './provedoresAdminKeys'

interface EnvelopeAvisoAdmin {
  data: AvisoAdmin
  message: string | null
}

/**
 * `POST /interno/provedores/{id}/avisos` (I14a2) - escopo **provedor**. O DTO
 * não tem `campoVersaoIds` (não existe campo fora de uma versão, §5.7) - a
 * estrutura do próprio tipo impede a violação, sem depender de disciplina.
 */
export function useCriarAvisoProvedor(provedorId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: CriarAvisoDeProvedorDto) => {
      const { data } = await apiInterno.post<EnvelopeAvisoAdmin>(
        `/provedores/${provedorId}/avisos`,
        dto,
      )
      return data.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: provedoresAdminKeys.detail(provedorId) })
    },
  })
}
