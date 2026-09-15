import { useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comEtagDeConcorrencia } from '../../utils/etagDeConcorrencia'
import type { ArtigoAdminDetalhe } from '../types/artigoAdmin'
import { artigosAdminKeys } from './artigosAdminKeys'

interface EnvelopeArtigoAdmin {
  data: ArtigoAdminDetalhe
  message: string | null
}

/**
 * `GET /interno/artigos/{id}` (I24) — `ApiResponse<T>` enveloped, role
 * `artigos-buscar`. Por **id numérico**, nunca por slug: buscar por slug é a
 * superfície pública (P8).
 *
 * A lista (I23) não traz `corpo`, `campoLayoutIds` nem `erroIds`: sem este
 * round-trip o modal de edição abriria com o textarea vazio e nenhum checkbox
 * marcado. `enabled` mantém a query parada enquanto nenhum artigo está aberto.
 */
export function useArtigoAdminPorId(id: number | null) {
  return useQuery({
    queryKey: artigosAdminKeys.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await apiInterno.get<EnvelopeArtigoAdmin>(`/artigos/${id}`)
      return comEtagDeConcorrencia(data.data)
    },
    enabled: id !== null && id > 0,
  })
}
