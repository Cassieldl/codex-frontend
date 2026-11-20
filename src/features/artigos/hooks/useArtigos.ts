import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiPublico } from '../../../services/api'
import type { ArtigoListaItem } from '../types/artigo'
import { artigosKeys, type ListarArtigosParams } from './artigosKeys'

export interface PaginaDeArtigos {
  items: ArtigoListaItem[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * `GET /artigos` (P7) - `PaginatedResponse<T>` **cru, na raiz**, sem envelope
 * `data`. P8 (`useArtigoPorSlug`) é enveloped; os dois convivem no mesmo
 * recurso e confundir um com o outro é exatamente o erro de AP-ARQUITETURA-001.
 *
 * Filtro de tipo sem acervo devolve `200` com lista vazia - nunca `404`/`422`;
 * quem nomeia esse vazio é a página (`EstadoTipoArtigoVazio`, §2.1).
 */
export function useArtigos(params: ListarArtigosParams) {
  return useQuery({
    queryKey: artigosKeys.list(params),
    queryFn: async () => {
      const { data } = await apiPublico.get<PaginaDeArtigos>('/artigos', { params })
      return data
    },
    placeholderData: keepPreviousData,
  })
}
