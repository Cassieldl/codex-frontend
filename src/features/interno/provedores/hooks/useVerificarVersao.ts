import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { VersaoAdminDetalhe } from '../types/versaoAdmin'
import { verificacoesVencidasKeys } from '../../verificacoesVencidas/hooks/verificacoesVencidasKeys'
import { versoesAdminKeys } from './versoesAdminKeys'

interface EnvelopeVersaoAdminDetalhe {
  data: VersaoAdminDetalhe
  message: string | null
}

interface VariaveisVerificarVersao {
  id: number
  verificadoEm: string
  etag?: string
}

/**
 * `PUT /interno/versoes/{id}/verificacao` (I10) — role `versoesprovedor-atualizar`.
 * Payload é **só** `{ verificadoEm }`, sem campo de ambiente estruturado (U3 —
 * Homologação/Produção não existe no modelo).
 */
export function useVerificarVersao() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, verificadoEm, etag }: VariaveisVerificarVersao) => {
      const { data } = await apiInterno.put<EnvelopeVersaoAdminDetalhe>(
        `/versoes/${id}/verificacao`,
        { verificadoEm },
        { etag },
      )
      return data.data
    },
    onSuccess: (_dados, variaveis) => {
      void queryClient.invalidateQueries({ queryKey: versoesAdminKeys.detail(variaveis.id) })
      // A versão sai da lista de verificações vencidas do Início assim que é verificada.
      void queryClient.invalidateQueries({ queryKey: verificacoesVencidasKeys.all })
    },
  })
}
