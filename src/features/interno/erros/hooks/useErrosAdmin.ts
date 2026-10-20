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

/** `GET /interno/erros`: o item não traz o agregado, por isso editar busca o detalhe (`useErroAdminPorId`). */
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
