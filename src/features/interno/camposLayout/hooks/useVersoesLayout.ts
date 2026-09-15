import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comEtagDeConcorrencia } from '../../utils/etagDeConcorrencia'
import type { VersaoLayoutAdmin } from '../types/versaoLayoutAdmin'
import { versoesLayoutKeys, type ListarVersoesLayoutParams } from './versoesLayoutKeys'

interface PaginatedResponseCru<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * `GET /interno/layout/versoes` (I15a) — `PaginatedResponse<T>` cru, role
 * `versoeslayout-buscar`. O `etag` de cada item é derivado do
 * `versaoConcorrencia` do corpo, que é a única fonte possível do validador
 * num item de lista.
 */
export function useVersoesLayout(params: ListarVersoesLayoutParams) {
  return useQuery({
    queryKey: versoesLayoutKeys.list(params),
    queryFn: async () => {
      const { data } = await apiInterno.get<PaginatedResponseCru<VersaoLayoutAdmin>>(
        '/layout/versoes',
        { params },
      )
      return { ...data, items: data.items.map(comEtagDeConcorrencia) }
    },
    placeholderData: keepPreviousData,
  })
}
