import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comEtagDeConcorrenciaNaColecao } from '../../utils/etagDeConcorrencia'
import type { LacunaBuscaTermo } from '../types/lacunaBusca'
import { lacunasBuscaKeys, type ListarTermosLacunaBuscaParams } from './lacunasBuscaKeys'

interface PaginatedResponseCru<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * `GET /interno/lacunas-busca/termos` — uma linha por termo, paginada por GRUPOS; `PaginatedResponse<T>`
 * **cru na raiz**, sem envelope `data` (role `lacunasbusca-buscar`). A fila priorizada é
 * `estado=Aberta&sortBy=ocorrencias`.
 *
 * O `etag` de cada termo sai do `versaoConcorrencia` do corpo (o da ocorrência de referência): é o
 * que permite resolver ou descartar o termo direto da lista, sem reabrir nada.
 */
export function useTermosLacunaBusca(params: ListarTermosLacunaBuscaParams) {
  return useQuery({
    queryKey: lacunasBuscaKeys.termos(params),
    queryFn: async () => {
      const { data } = await apiInterno.get<PaginatedResponseCru<LacunaBuscaTermo>>(
        '/lacunas-busca/termos',
        { params },
      )
      return { ...data, items: comEtagDeConcorrenciaNaColecao(data.items, 'items') }
    },
    placeholderData: keepPreviousData,
  })
}
