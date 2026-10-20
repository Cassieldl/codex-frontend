import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { ehConflitoDeConcorrencia } from '../../utils/codigoDeErroApi'
import type { AtualizarVersaoDto, VersaoAdminDetalhe } from '../types/versaoAdmin'
import { versoesAdminKeys } from './versoesAdminKeys'

interface EnvelopeVersaoAdminDetalhe {
  data: VersaoAdminDetalhe
  message: string | null
}

interface VariaveisAtualizarVersao {
  id: number
  provedorId: number
  dto: AtualizarVersaoDto
  etag?: string
}

/**
 * `PUT /interno/versoes/{id}` (I8b), role `versoesprovedor-atualizar`, `If-Match` obrigatório.
 * No `409` de concorrência relê detalhe e lista, para a segunda tentativa levar o etag novo.
 */
export function useAtualizarVersaoProvedor() {
  const queryClient = useQueryClient()

  function invalidar({ id, provedorId }: VariaveisAtualizarVersao) {
    void queryClient.invalidateQueries({ queryKey: versoesAdminKeys.detail(id) })
    void queryClient.invalidateQueries({ queryKey: versoesAdminKeys.porProvedor(provedorId) })
  }

  return useMutation({
    mutationFn: async ({ id, dto, etag }: VariaveisAtualizarVersao) => {
      const { data } = await apiInterno.put<EnvelopeVersaoAdminDetalhe>(`/versoes/${id}`, dto, {
        etag,
      })
      return data.data
    },
    onSuccess: (_dados, variaveis) => invalidar(variaveis),
    onError: (erro, variaveis) => {
      if (ehConflitoDeConcorrencia(erro)) invalidar(variaveis)
    },
  })
}
