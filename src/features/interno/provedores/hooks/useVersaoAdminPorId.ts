import { useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comEtagDeConcorrencia, formatarEtagConcorrencia } from '../../utils/etagDeConcorrencia'
import type { VersaoAdminDetalhe } from '../types/versaoAdmin'
import { versoesAdminKeys } from './versoesAdminKeys'

interface EnvelopeVersaoAdminDetalhe {
  data: VersaoAdminDetalhe
  message: string | null
}

/**
 * `GET /interno/versoes/{id}` (I8a) — inclui os avisos desta versão.
 *
 * Mesmas duas fontes do validador que `useProvedorAdminPorId`: header `ETag`
 * primeiro, `versaoConcorrencia` do corpo como reserva canônica. Cada aviso
 * aninhado recebe o `etag` derivado do próprio `versaoConcorrencia`, porque o
 * header não alcança coleção aninhada e os avisos são editados nesta tela.
 */
export function useVersaoAdminPorId(versaoId: number) {
  return useQuery({
    queryKey: versoesAdminKeys.detail(versaoId),
    queryFn: async () => {
      const response = await apiInterno.get<EnvelopeVersaoAdminDetalhe>(`/versoes/${versaoId}`)
      const versao = response.data.data
      const etagDoHeader = response.headers.etag as string | undefined

      return {
        ...versao,
        etag: etagDoHeader ?? formatarEtagConcorrencia(versao.versaoConcorrencia),
        avisos: versao.avisos.map(comEtagDeConcorrencia),
      }
    },
    enabled: versaoId > 0,
  })
}
