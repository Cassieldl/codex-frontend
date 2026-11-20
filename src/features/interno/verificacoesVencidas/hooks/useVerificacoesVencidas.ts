import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { VerificacaoVencida } from '../types/verificacaoVencida'
import {
  verificacoesVencidasKeys,
  type ListarVerificacoesVencidasParams,
} from './verificacoesVencidasKeys'

interface PaginatedResponseCru<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * `GET /interno/versoes/verificacoes-vencidas` - `PaginatedResponse<T>` **cru na raiz**, sem
 * envelope `data` (role `versoesprovedor-buscar`). O servidor já entrega a ordem: nunca
 * verificadas primeiro, depois da mais antiga à mais nova.
 *
 * `items` é obrigatório no contrato. Resposta lida no nível errado do envelope falha nomeando a
 * coleção, em vez de virar lista vazia - que a tela exibiria como "nada vencido".
 */
export function useVerificacoesVencidas(params: ListarVerificacoesVencidasParams) {
  return useQuery({
    queryKey: verificacoesVencidasKeys.list(params),
    queryFn: async () => {
      const { data } = await apiInterno.get<PaginatedResponseCru<VerificacaoVencida>>(
        '/versoes/verificacoes-vencidas',
        { params },
      )

      if (!Array.isArray(data.items))
        throw new Error('A resposta da API não trouxe a coleção "items", que o contrato exige.')

      return data
    },
    placeholderData: keepPreviousData,
  })
}
