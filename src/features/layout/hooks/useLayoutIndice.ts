import { useQuery } from '@tanstack/react-query'
import { apiPublico } from '../../../services/api'
import type { LayoutIndice } from '../types/layoutPublico'
import { layoutKeys } from './layoutKeys'

interface EnvelopeLayoutIndice {
  data: LayoutIndice
  message: string | null
}

const DEZ_MINUTOS_MS = 1000 * 60 * 10

/**
 * `GET /layout` (P10) — índice de versões do Layout InvoiCy. Conteúdo estável
 * (uma versão nova é evento raro), mesmo `staleTime` dos demais GETs públicos
 * de conteúdo. A lista já vem ordenada por `ordem` DESC do backend — o
 * frontend nunca reordena.
 */
export function useLayoutIndice() {
  return useQuery({
    queryKey: layoutKeys.indice(),
    queryFn: async () => {
      const { data } = await apiPublico.get<EnvelopeLayoutIndice>('/layout')
      return data.data
    },
    staleTime: DEZ_MINUTOS_MS,
  })
}
