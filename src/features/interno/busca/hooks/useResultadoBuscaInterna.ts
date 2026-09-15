import { useQuery } from '@tanstack/react-query'
import type { ResultadoBusca } from '../../../busca/types/resultadoBusca'
import { apiInterno } from '../../../../services/apiInterno'
import { buscaInternaKeys, type ParametrosBuscaInterna } from './buscaInternaKeys'

interface EnvelopeResultadoBusca {
  data: ResultadoBusca
  message: string | null
}

const TERMO_MINIMO = 2

/**
 * `GET /interno/busca` (I21, M15/M21) — `ApiResponse<ResultadoBusca>`,
 * superfície interna. Mesmo tipo de `useResultadoBusca` (público), mas
 * **enxerga rascunho** e usa `apiInterno` (nunca `apiPublico` — endpoint
 * próprio, não reusa `/busca`). Role `indicebusca-buscar`, checada só no
 * backend — este hook não valida permissão, apenas chama a rota.
 */
export function useResultadoBuscaInterna({ q, provedor }: ParametrosBuscaInterna) {
  return useQuery({
    queryKey: buscaInternaKeys.resultado({ q, provedor }),
    queryFn: async () => {
      const { data } = await apiInterno.get<EnvelopeResultadoBusca>('/busca', {
        params: { q, provedor },
      })
      return data.data
    },
    enabled: q.trim().length >= TERMO_MINIMO,
  })
}
