import { useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comEtagDeConcorrencia } from '../../utils/etagDeConcorrencia'
import type { ExemploAdmin } from '../types/exemploAdmin'
import { exemplosAdminKeys } from './exemplosAdminKeys'

interface EnvelopeExemplosAdmin {
  data: ExemploAdmin[]
  message: string | null
}

/**
 * `GET /interno/versoes/{id}/exemplos` (I38) — role `exemplos-buscar`. Lista
 * completa, enveloped em `data` (a coleção aninhada não usa `PaginatedResponse`).
 */
export function useExemplosPorVersao(versaoId: number) {
  return useQuery({
    queryKey: exemplosAdminKeys.porVersao(versaoId),
    queryFn: async () => {
      const { data } = await apiInterno.get<EnvelopeExemplosAdmin>(`/versoes/${versaoId}/exemplos`)
      return data.data.map(comEtagDeConcorrencia)
    },
    enabled: versaoId > 0,
  })
}
