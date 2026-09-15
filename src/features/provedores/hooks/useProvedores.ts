import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiPublico } from '../../../services/api'
import type { ProvedorListaItem } from '../types/provedor'
import { provedoresKeys, type ListarProvedoresParams } from './provedoresKeys'

interface PaginatedResponseCru<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * `GET /provedores` (P2, `analise-backend.md` §4.1) — `PaginatedResponse<T>`
 * **cru**, sem envelope `data`. Nunca confundir com `ApiResponse<T>`
 * (AP-ARQUITETURA-001) — é o par que já quebrou integração neste time.
 */
export function useProvedores(params: ListarProvedoresParams) {
  return useQuery({
    queryKey: provedoresKeys.list(params),
    queryFn: async () => {
      const { data } = await apiPublico.get<PaginatedResponseCru<ProvedorListaItem>>(
        '/provedores',
        { params },
      )
      return data
    },
    placeholderData: keepPreviousData,
  })
}
