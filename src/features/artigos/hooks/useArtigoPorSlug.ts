import { useQuery } from '@tanstack/react-query'
import { apiPublico } from '../../../services/api'
import type { ArtigoDetalhe } from '../types/artigo'
import { artigosKeys } from './artigosKeys'

interface EnvelopeArtigoDetalhe {
  data: ArtigoDetalhe
  message: string | null
}

/**
 * `GET /artigos/{slug}` (P8) - `ApiResponse<ArtigoDetalhe>`, com envelope
 * `data` (ao contrário de P7, que é paginado cru).
 *
 * `404`/`410` propagam como `AxiosError` sem tratamento aqui - quem distingue
 * "nunca existiu" de "saiu do ar" é a página (`artigo-detalhe.tsx`), lendo
 * `error.response?.status`. `retry: false` porque nenhum dos dois é transiente.
 */
export function useArtigoPorSlug(artigoSlug: string) {
  return useQuery({
    queryKey: artigosKeys.detail(artigoSlug),
    queryFn: async () => {
      const { data } = await apiPublico.get<EnvelopeArtigoDetalhe>(`/artigos/${artigoSlug}`)
      return data.data
    },
    retry: false,
  })
}
