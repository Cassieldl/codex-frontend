import { useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { formatarEtagConcorrencia } from '../../utils/etagDeConcorrencia'
import type { ProvedorAdminDetalhe } from '../types/provedorAdmin'
import { prepararAvisosAdmin } from '../utils/prepararAvisosAdmin'
import { provedoresAdminKeys } from './provedoresAdminKeys'

interface EnvelopeProvedorAdminDetalhe {
  data: ProvedorAdminDetalhe
  message: string | null
}

/**
 * `GET /interno/provedores/{id}` (I2) — inclui todos os avisos de provedor
 * (publicados e rascunho). Hooks de mutação (`useAtualizarProvedor`,
 * `usePublicarProvedor`) repassam o `etag` daqui em `If-Match` (M9).
 *
 * Duas fontes, uma só verdade: o header `ETag` da resposta e o
 * `versaoConcorrencia` do corpo carregam o **mesmo** validador. O header vem
 * primeiro por ser o mecanismo HTTP; o corpo é a reserva canônica, usada
 * quando o header não chega ao JavaScript (resposta cross-origin sem
 * `Access-Control-Expose-Headers: ETag`).
 *
 * Cada aviso aninhado recebe o próprio `etag` derivado do corpo: o header é um
 * por resposta e não alcança coleção aninhada, e os avisos são editados,
 * publicados e removidos desta mesma tela.
 */
export function useProvedorAdminPorId(id: number) {
  return useQuery({
    queryKey: provedoresAdminKeys.detail(id),
    queryFn: async () => {
      const response = await apiInterno.get<EnvelopeProvedorAdminDetalhe>(`/provedores/${id}`)
      const provedor = response.data.data
      const etagDoHeader = response.headers.etag as string | undefined

      return {
        ...provedor,
        etag: etagDoHeader ?? formatarEtagConcorrencia(provedor.versaoConcorrencia),
        avisos: prepararAvisosAdmin(provedor.avisos),
      }
    },
    enabled: id > 0,
  })
}
