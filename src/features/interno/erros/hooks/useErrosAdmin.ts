import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comEtagDeConcorrenciaNaColecao } from '../../utils/etagDeConcorrencia'
import type { ErroAdminListaItem } from '../types/erroAdmin'
import { errosAdminKeys, type ListarErrosAdminParams } from './errosAdminKeys'

interface PaginatedResponseCru<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * `GET /interno/erros` (I18) — `PaginatedResponse<T>` cru, role `erros-buscar`.
 * O `etag` de cada item vem do `versaoConcorrencia` do corpo: erro é agregado
 * editado por modal a partir da própria lista, sem round-trip de detalhe.
 */
export function useErrosAdmin(params: ListarErrosAdminParams) {
  return useQuery({
    queryKey: errosAdminKeys.list(params),
    queryFn: async () => {
      const { data } = await apiInterno.get<PaginatedResponseCru<ErroAdminListaItem>>('/erros', {
        params,
      })
      return { ...data, items: comEtagDeConcorrenciaNaColecao(data.items, 'items') }
    },
    placeholderData: keepPreviousData,
  })
}
