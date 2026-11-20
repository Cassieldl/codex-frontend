import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comEtagDeConcorrenciaNaColecao } from '../../utils/etagDeConcorrencia'
import type { VersaoAdminListaItem } from '../types/versaoAdmin'
import { versoesAdminKeys } from './versoesAdminKeys'

interface EnvelopeVersoesAdmin {
  data: VersaoAdminListaItem[]
  message: string | null
}

/**
 * `GET /interno/provedores/{id}/versoes` (I6) - `ApiResponse<T[]>`, role
 * `versoesprovedor-buscar`. O `etag` de cada versão sai do
 * `versaoConcorrencia` do corpo (coleção, sem header por item).
 *
 * Exportada para quem busca as versões de vários provedores de uma vez (`useQueries`) dividir o
 * cache com esta tela.
 */
export function consultaVersoesProvedorAdmin(provedorId: number) {
  return queryOptions({
    queryKey: versoesAdminKeys.porProvedor(provedorId),
    queryFn: async () => {
      const { data } = await apiInterno.get<EnvelopeVersoesAdmin>(
        `/provedores/${provedorId}/versoes`,
      )
      return comEtagDeConcorrenciaNaColecao(data.data, 'data')
    },
    enabled: provedorId > 0,
  })
}

export function useVersoesProvedorAdmin(provedorId: number) {
  return useQuery(consultaVersoesProvedorAdmin(provedorId))
}
