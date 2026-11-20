import { useQuery } from '@tanstack/react-query'
import { apiPublico } from '../../../services/api'
import type { ResultadoBusca } from '../types/resultadoBusca'
import { buscaKeys, type ParametrosBusca } from './buscaKeys'

interface EnvelopeResultadoBusca {
  data: ResultadoBusca
  message: string | null
}

const TERMO_MINIMO = 2

/**
 * `GET /busca` (P1, `analise-backend.md` §4.1) - `ApiResponse<ResultadoBusca>`,
 * superfície pública. Usa sempre `apiPublico`, nunca `apiInterno` - a busca da
 * área interna (M15/M21) tem hook próprio (`useResultadoBuscaInterna`, fora
 * desta unidade) que aponta para `GET /interno/busca`.
 */
export function useResultadoBusca({ q, provedor }: ParametrosBusca) {
  return useQuery({
    queryKey: buscaKeys.resultado({ q, provedor }),
    queryFn: async () => {
      const { data } = await apiPublico.get<EnvelopeResultadoBusca>('/busca', {
        params: { q, provedor },
      })
      return data.data
    },
    enabled: q.trim().length >= TERMO_MINIMO,
  })
}
