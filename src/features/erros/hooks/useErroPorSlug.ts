import { useQuery } from '@tanstack/react-query'
import { apiPublico } from '../../../services/api'
import type { ErroDetalhe } from '../types/erro'
import { errosKeys } from './errosKeys'

interface EnvelopeErroDetalhe {
  data: ErroDetalhe
  message: string | null
}

/**
 * `GET /erros/{slug}` (P6, `analise-backend.md` §4.1) — `ApiResponse<ErroDetalhe>`,
 * superfície pública (`apiPublico`, nunca `apiInterno`).
 *
 * `404`/`410` propagam como `AxiosError` sem tratamento aqui — quem distingue
 * os dois é a página (`erro-detalhe.tsx`), lendo `error.response?.status`.
 * M7: nunca colapsar "nunca existiu" (`404`) e "existiu e foi despublicado"
 * (`410`) na mesma leitura. `retry: false` porque nenhum dos dois é transiente.
 */
export function useErroPorSlug(erroSlug: string) {
  return useQuery({
    queryKey: errosKeys.detail(erroSlug),
    queryFn: async () => {
      const { data } = await apiPublico.get<EnvelopeErroDetalhe>(`/erros/${erroSlug}`)
      return data.data
    },
    retry: false,
  })
}
