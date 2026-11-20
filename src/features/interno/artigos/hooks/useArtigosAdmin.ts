import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comEtagDeConcorrenciaNaColecao } from '../../utils/etagDeConcorrencia'
import type { ArtigoAdminListaItem } from '../types/artigoAdmin'
import { artigosAdminKeys, type ListarArtigosAdminParams } from './artigosAdminKeys'

interface PaginatedResponseCru<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * `GET /interno/artigos` (I23) - `PaginatedResponse<T>` **cru na raiz** (I24 e
 * as demais respostas do recurso é que vêm enveloped em `data`), role
 * `artigos-buscar`. Enxerga rascunho.
 *
 * O `etag` de cada item sai do `versaoConcorrencia` do corpo - o header `ETag`
 * é um por resposta e não alcança item de lista. É o que permite publicar,
 * despublicar e remover direto da listagem.
 */
export function useArtigosAdmin(params: ListarArtigosAdminParams) {
  return useQuery({
    queryKey: artigosAdminKeys.list(params),
    queryFn: async () => {
      const { data } = await apiInterno.get<PaginatedResponseCru<ArtigoAdminListaItem>>(
        '/artigos',
        {
          params,
        },
      )
      return { ...data, items: comEtagDeConcorrenciaNaColecao(data.items, 'items') }
    },
    placeholderData: keepPreviousData,
  })
}
