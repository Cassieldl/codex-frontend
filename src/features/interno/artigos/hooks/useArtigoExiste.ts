import { useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { ArtigoExiste } from '../types/artigoAdmin'
import { artigosAdminKeys } from './artigosAdminKeys'

interface EnvelopeArtigoExiste {
  data: ArtigoExiste
  message: string | null
}

/**
 * `GET /interno/artigos/existe?slug=` (I36) - `ApiResponse<T>` enveloped, role
 * `artigos-buscar`.
 *
 * É o caminho de F-2: descobrir se o artigo reservado "Como funciona" já
 * existe. A alternativa que a análise tinha proposto - varrer a primeira
 * página de 100 itens da listagem - passa a mentir em silêncio assim que o
 * acervo cresce (falso "ainda não existe" para um artigo que só não estava na
 * primeira leva). Nunca reintroduzir a varredura.
 */
export function useArtigoExiste(slug: string) {
  return useQuery({
    queryKey: artigosAdminKeys.existe(slug),
    queryFn: async () => {
      const { data } = await apiInterno.get<EnvelopeArtigoExiste>('/artigos/existe', {
        params: { slug },
      })
      return data.data
    },
    enabled: slug.length > 0,
  })
}
