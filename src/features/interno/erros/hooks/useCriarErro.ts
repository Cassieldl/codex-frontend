import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { ErroAdminDetalhe, ErroFormDto } from '../types/erroAdmin'
import { errosAdminKeys } from './errosAdminKeys'

interface EnvelopeErroAdminDetalhe {
  data: ErroAdminDetalhe
  message: string | null
}

/**
 * `POST /interno/erros` (I19) - role `erros-adicionar`. `versoesProvedorIds`
 * pode ser `[]` salvo quando `origem === 'Prefeitura'` (U9) - validado no
 * schema Zod de `ErroForm`, não aqui (o hook só transporta o payload já validado).
 */
export function useCriarErro() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: ErroFormDto) => {
      const { data } = await apiInterno.post<EnvelopeErroAdminDetalhe>('/erros', dto)
      return data.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: errosAdminKeys.lists() })
    },
  })
}
