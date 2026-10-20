import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comEtagDeConcorrenciaNaColecao } from '../../utils/etagDeConcorrencia'
import type { ProvedorAdminListaItem } from '../types/provedorAdmin'
import { provedoresAdminKeys, type ListarProvedoresAdminParams } from './provedoresAdminKeys'

interface PaginatedResponseCru<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * `GET /interno/provedores` (I1) — `PaginatedResponse<T>` cru, role
 * `provedores-buscar`. O `etag` de cada item é derivado do
 * `versaoConcorrencia` do corpo (header `ETag` não alcança item de lista) —
 * é o que permite publicar/despublicar direto da lista.
 */
interface OpcoesProvedoresAdmin {
  /** Desligado, a lista não é buscada: quem só precisa dela num modal liga ao abrir. */
  enabled?: boolean
}

export function useProvedoresAdmin(
  params: ListarProvedoresAdminParams,
  { enabled = true }: OpcoesProvedoresAdmin = {},
) {
  return useQuery({
    queryKey: provedoresAdminKeys.list(params),
    queryFn: async () => {
      const { data } = await apiInterno.get<PaginatedResponseCru<ProvedorAdminListaItem>>(
        '/provedores',
        { params },
      )
      return { ...data, items: comEtagDeConcorrenciaNaColecao(data.items, 'items') }
    },
    placeholderData: keepPreviousData,
    enabled,
  })
}
