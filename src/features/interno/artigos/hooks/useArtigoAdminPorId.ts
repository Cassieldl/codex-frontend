import { useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { comEtagDeConcorrencia } from '../../utils/etagDeConcorrencia'
import type { ArtigoAdminDetalhe } from '../types/artigoAdmin'
import { artigosAdminKeys } from './artigosAdminKeys'

interface EnvelopeArtigoAdmin {
  data: ArtigoAdminDetalhe
  message: string | null
}

const COLECOES_OBRIGATORIAS = ['campoLayoutIds', 'erroIds', 'erros', 'camposLayout'] as const

/**
 * O formulário reenvia os ids que vierem daqui, e o PUT substitui os vínculos gravados: coleção
 * ausente tratada como lista vazia apagaria vínculos em silêncio. Então falha e nomeia o que faltou.
 */
function exigirVinculos(artigo: ArtigoAdminDetalhe): ArtigoAdminDetalhe {
  for (const colecao of COLECOES_OBRIGATORIAS) {
    if (!Array.isArray(artigo[colecao]))
      throw new Error(`A resposta da API não trouxe a coleção "${colecao}", que o contrato exige.`)
  }
  return artigo
}

/**
 * `GET /interno/artigos/{id}` (I24), `ApiResponse<T>` enveloped, role `artigos-buscar`. Por id
 * numérico, nunca por slug: buscar por slug é a superfície pública.
 *
 * A lista (I23) não traz `corpo` nem os vínculos: sem este round-trip o modal de edição abriria
 * vazio. `enabled` mantém a query parada enquanto nenhum artigo está aberto.
 */
export function useArtigoAdminPorId(id: number | null) {
  return useQuery({
    queryKey: artigosAdminKeys.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await apiInterno.get<EnvelopeArtigoAdmin>(`/artigos/${id}`)
      return comEtagDeConcorrencia(exigirVinculos(data.data))
    },
    enabled: id !== null && id > 0,
  })
}
