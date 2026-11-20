import { useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comEtagDeConcorrencia } from '../../utils/etagDeConcorrencia'
import type { ComunicadoAdminDetalhe } from '../types/comunicadoAdmin'
import { comunicadosAdminKeys } from './comunicadosAdminKeys'

interface EnvelopeComunicadoAdmin {
  data: ComunicadoAdminDetalhe
  message: string | null
}

/**
 * `GET /interno/comunicados/{id}` (I31) - `ApiResponse<T>` enveloped, role
 * `comunicados-buscar`.
 *
 * A lista (I30) não traz `corpo`, `provedorId` nem `versaoProvedorId`: sem
 * este round-trip o modal de edição abriria com o textarea vazio e os selects
 * sem opção pré-selecionada. `enabled` mantém a query parada enquanto nenhum
 * comunicado está aberto.
 */
export function useComunicadoAdminPorId(id: number | null) {
  return useQuery({
    queryKey: comunicadosAdminKeys.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await apiInterno.get<EnvelopeComunicadoAdmin>(`/comunicados/${id}`)
      return comEtagDeConcorrencia(data.data)
    },
    enabled: id !== null && id > 0,
  })
}
