import { useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comEtagDeConcorrenciaNaColecao } from '../../utils/etagDeConcorrencia'
import type { RespostaCamposVersao } from '../types/campoVersaoAdmin'
import { camposVersaoKeys } from './camposVersaoKeys'

interface EnvelopeCamposVersao {
  data: RespostaCamposVersao
  message: string | null
}

/**
 * `GET /interno/versoes/{id}/campos` (I11) — shape exato `{ campos, camposLayoutAusentes }`
 * (nome de campo `campos`, não `camposVersao` — atenção do próprio contrato).
 * `incluirAusentes=true` **só aqui** (área interna) — nunca na superfície pública (R2).
 *
 * O `etag` de cada campo preenchido vem do `versaoConcorrencia` do corpo (o
 * agregado é uma coleção aninhada, fora do alcance do header `ETag`) e é o que
 * alimenta o `If-Match` de I13a/I13b. `camposLayoutAusentes` não recebe `etag`:
 * ali o campo canônico só é lido para o select de criação (U4), nunca editado
 * por esta tela.
 */
export function useCamposVersao(versaoId: number, incluirAusentes = true) {
  return useQuery({
    queryKey: camposVersaoKeys.porVersao(versaoId, incluirAusentes),
    queryFn: async () => {
      const { data } = await apiInterno.get<EnvelopeCamposVersao>(`/versoes/${versaoId}/campos`, {
        params: { incluirAusentes },
      })
      return { ...data.data, campos: comEtagDeConcorrenciaNaColecao(data.data.campos, 'campos') }
    },
    enabled: versaoId > 0,
  })
}
