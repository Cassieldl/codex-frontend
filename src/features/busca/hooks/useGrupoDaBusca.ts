import { useQuery } from '@tanstack/react-query'
import { apiPublico } from '../../../services/api'
import type { GrupoResultado, ResultadoBusca } from '../types/resultadoBusca'
import { buscaKeys } from './buscaKeys'
import type { ParametrosPaginaDoGrupo } from './buscaKeys'

interface EnvelopeResultadoBusca {
  data: ResultadoBusca
  message: string | null
}

const CINCO_MINUTOS = 1000 * 60 * 5

/**
 * Uma página de um grupo da busca: `GET /busca` recortado por `tipo`. A busca sem recorte traz
 * só os mais pontuados de todos os tipos juntos, então o resto de cada grupo vem por aqui.
 */
export function useGrupoDaBusca(parametros: ParametrosPaginaDoGrupo, habilitado: boolean) {
  return useQuery({
    queryKey: buscaKeys.paginaDoGrupo(parametros),
    // O `signal` cancela o pedido quando a página muda antes da resposta chegar.
    queryFn: async ({ signal }): Promise<GrupoResultado | null> => {
      const { q, provedor, tipo, pagina, tamanhoPagina } = parametros
      const { data } = await apiPublico.get<EnvelopeResultadoBusca>('/busca', {
        params: { q, provedor, tipo, pagina, tamanhoPagina },
        signal,
      })
      return data.data.grupos.find((grupo) => grupo.tipo === tipo) ?? null
    },
    enabled: habilitado,
    staleTime: CINCO_MINUTOS,
  })
}
