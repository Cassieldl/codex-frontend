import { useQuery } from '@tanstack/react-query'
import { apiPublico } from '../../../services/api'
import type { HomeDto } from '../types/home'
import { homeKeys } from './homeKeys'

/**
 * `GET /home` (P9) - `ApiResponse<HomeDto>` **enveloped em `data`**, ao
 * contrário das listagens públicas (`GET /provedores`, `GET /artigos`), que
 * vêm cruas na raiz. Os dois envelopes convivem na mesma API
 * (AP-ARQUITETURA-001) - ler o errado aqui devolveria `undefined` em silêncio.
 */
interface EnvelopeHome {
  data: HomeDto
  message: string | null
}

/** Espelha o `Cache-Control: max-age=60` que o servidor devolve em P9 (PQ-12). */
const UM_MINUTO_MS = 1000 * 60

export function useHome() {
  return useQuery({
    queryKey: homeKeys.all,
    queryFn: async () => {
      const { data } = await apiPublico.get<EnvelopeHome>('/home')
      return data.data
    },
    staleTime: UM_MINUTO_MS,
  })
}
