import { useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comEtagDeConcorrencia } from '../../utils/etagDeConcorrencia'
import type { VersaoAdminListaItem } from '../types/versaoAdmin'
import { versoesAdminKeys } from './versoesAdminKeys'

interface EnvelopeVersoesAdmin {
  data: VersaoAdminListaItem[]
  message: string | null
}

/**
 * `GET /interno/provedores/{id}/versoes` (I6) — `ApiResponse<T[]>`, role
 * `versoesprovedor-buscar`. O `etag` de cada versão sai do
 * `versaoConcorrencia` do corpo (coleção, sem header por item).
 */
export function useVersoesProvedorAdmin(provedorId: number) {
  return useQuery({
    queryKey: versoesAdminKeys.porProvedor(provedorId),
    queryFn: async () => {
      const { data } = await apiInterno.get<EnvelopeVersoesAdmin>(
        `/provedores/${provedorId}/versoes`,
      )
      return data.data.map(comEtagDeConcorrencia)
    },
    enabled: provedorId > 0,
  })
}
