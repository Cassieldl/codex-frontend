import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { AtualizarErroDto, ErroAdminDetalhe } from '../types/erroAdmin'
import { errosAdminKeys } from './errosAdminKeys'

interface EnvelopeErroAdminDetalhe {
  data: ErroAdminDetalhe
  message: string | null
}

interface VariaveisAtualizarErro {
  id: number
  dto: AtualizarErroDto
  etag?: string
}

/**
 * `PUT /interno/erros/{id}` (I20a) — role `erros-atualizar`, `If-Match`
 * obrigatório (M9). `409` nunca reseta o modal — a página mantém o formulário
 * aberto com o que foi digitado.
 */
export function useAtualizarErro() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, dto, etag }: VariaveisAtualizarErro) => {
      const { data } = await apiInterno.put<EnvelopeErroAdminDetalhe>(`/erros/${id}`, dto, {
        etag,
      })
      return data.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: errosAdminKeys.lists() })
    },
  })
}
