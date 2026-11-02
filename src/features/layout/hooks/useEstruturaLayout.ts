import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { apiPublico } from '../../../services/api'
import { devoRetentar } from '../../../utils/retentativaDeQuery'
import type { EstruturaLayout } from '../types/estruturaLayout'
import { layoutKeys } from './layoutKeys'

interface EnvelopeEstruturaLayout {
  data: EstruturaLayout
  message: string | null
}

/**
 * `404` cobre versão inexistente, despublicada ou ainda sem estrutura: para o leitor do dicionário
 * é tudo "a estrutura não está disponível", e a página segue de pé.
 */
export class ErroEstruturaIndisponivel extends Error {
  readonly status = 404

  constructor() {
    super('EstruturaLayout: estrutura indisponível (status 404)')
    this.name = 'ErroEstruturaIndisponivel'
  }
}

const DEZ_MINUTOS_MS = 1000 * 60 * 10

/**
 * `GET /layout/versoes/{versaoSlug}/estrutura`. Só busca com `habilitado`, que a página liga ao
 * abrir a aba XML ou JSON; desligado, ainda devolve o que já estiver em cache.
 */
export function useEstruturaLayout(versaoSlug: string, habilitado: boolean) {
  return useQuery({
    queryKey: layoutKeys.estrutura(versaoSlug),
    queryFn: async () => {
      try {
        const { data } = await apiPublico.get<EnvelopeEstruturaLayout>(
          `/layout/versoes/${versaoSlug}/estrutura`,
        )
        return data.data
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          throw new ErroEstruturaIndisponivel()
        }
        throw error
      }
    },
    enabled: habilitado && versaoSlug.length > 0,
    staleTime: DEZ_MINUTOS_MS,
    retry: (contagem, erro) => devoRetentar(contagem, erro),
  })
}
