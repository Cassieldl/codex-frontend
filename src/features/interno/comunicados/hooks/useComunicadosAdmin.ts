import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comEtagDeConcorrenciaNaColecao } from '../../utils/etagDeConcorrencia'
import type { ComunicadoAdminListaItem } from '../types/comunicadoAdmin'
import { comunicadosAdminKeys, type ListarComunicadosAdminParams } from './comunicadosAdminKeys'

interface PaginatedResponseCru<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * `GET /interno/comunicados` (I30) — `PaginatedResponse<T>` **cru na raiz**
 * (I31-I35 é que vêm enveloped em `data`), role `comunicados-buscar`.
 *
 * `incluirEncerrados` viaja como o chamador mandou, sem default próprio aqui:
 * o filtro é da tela, e o default do backend (`false`) esconde apenas o que
 * **encerrou** (`expiraEm` no passado) — rascunho vigente segue na resposta,
 * que é o que sustenta o badge "Rascunho" da lista.
 *
 * O `etag` de cada item sai do `versaoConcorrencia` do corpo (header `ETag` é
 * um por resposta, não alcança item de lista) — é o que permite publicar,
 * despublicar e remover direto da listagem.
 */
export function useComunicadosAdmin(params: ListarComunicadosAdminParams) {
  return useQuery({
    queryKey: comunicadosAdminKeys.list(params),
    queryFn: async () => {
      const { data } = await apiInterno.get<PaginatedResponseCru<ComunicadoAdminListaItem>>(
        '/comunicados',
        { params },
      )
      return { ...data, items: comEtagDeConcorrenciaNaColecao(data.items, 'items') }
    },
    placeholderData: keepPreviousData,
  })
}
