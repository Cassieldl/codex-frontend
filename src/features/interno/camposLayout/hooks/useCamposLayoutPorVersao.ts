import { useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comEtagDeConcorrenciaNaColecao } from '../../utils/etagDeConcorrencia'
import type { CampoLayoutAdmin } from '../types/campoLayoutAdmin'
import { camposLayoutKeys } from './camposLayoutKeys'

interface EnvelopeCamposLayoutAdmin {
  data: CampoLayoutAdmin[]
  message: string | null
}

/**
 * `GET /interno/layout/versoes/{id}/campos` (I16) — `ApiResponse<T[]>`, role
 * `campolayout-buscar`. Reaproveitado por `CampoVersaoForm` (via mapeamento
 * para `OpcaoCampoLayout`) para alimentar o select de campo canônico (U4).
 *
 * O `etag` de cada campo é derivado do `versaoConcorrencia` do corpo — a
 * resposta é uma coleção, então o header `ETag` não alcança item nenhum, e é
 * daqui que sai o `If-Match` de I17a/I17b/I17c.
 */
export function useCamposLayoutPorVersao(versaoLayoutId: number) {
  return useQuery({
    queryKey: camposLayoutKeys.porVersaoLayout(versaoLayoutId),
    queryFn: async () => {
      const { data } = await apiInterno.get<EnvelopeCamposLayoutAdmin>(
        `/layout/versoes/${versaoLayoutId}/campos`,
      )
      return comEtagDeConcorrenciaNaColecao(data.data, 'data')
    },
    enabled: versaoLayoutId > 0,
  })
}
