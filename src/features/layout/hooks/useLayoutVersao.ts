import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { apiPublico } from '../../../services/api'
import { devoRetentar } from '../../../utils/retentativaDeQuery'
import type { LayoutVersaoPagina } from '../types/layoutPublico'
import { layoutKeys } from './layoutKeys'

interface EnvelopeLayoutVersaoPagina {
  data: LayoutVersaoPagina
  message: string | null
}

export type TipoErroLayoutVersao = 'nao_encontrada' | 'despublicada' | 'cap_excedido'

/**
 * Erro tipado de P11. Os três desfechos pedem telas com textos diferentes, e a
 * diferença importa: `404` é "nunca existiu", `410` é "existe e saiu do ar" e
 * `422` é um limite estrutural do agregado (cap de campos por versão) - este
 * último jamais pode cair no `ErrorState` genérico, porque "tentar novamente"
 * nunca vai funcionar.
 */
export class ErroLayoutVersaoHttp extends Error {
  readonly tipo: TipoErroLayoutVersao
  readonly status: number

  constructor(tipo: TipoErroLayoutVersao, status: number) {
    super(`LayoutVersao: erro ${tipo} (status ${status})`)
    this.name = 'ErroLayoutVersaoHttp'
    this.tipo = tipo
    this.status = status
  }
}

function classificarErro(error: unknown): ErroLayoutVersaoHttp | null {
  if (!isAxiosError(error)) return null
  const status = error.response?.status

  if (status === 404) return new ErroLayoutVersaoHttp('nao_encontrada', 404)
  if (status === 410) return new ErroLayoutVersaoHttp('despublicada', 410)
  if (status === 422) return new ErroLayoutVersaoHttp('cap_excedido', 422)
  return null
}

const DEZ_MINUTOS_MS = 1000 * 60 * 10

export interface OpcoesLayoutVersao {
  /**
   * Durante a troca de versão, mantém a anterior na tela até a nova chegar: a página não desmonta
   * e o foco fica na lista de versões.
   */
  manterAnterior?: boolean
}

/** `GET /layout/versoes/{versaoSlug}` (P11) - dicionário denso de uma versão. */
export function useLayoutVersao(
  versaoSlug: string,
  { manterAnterior = false }: OpcoesLayoutVersao = {},
) {
  return useQuery({
    queryKey: layoutKeys.versao(versaoSlug),
    queryFn: async () => {
      try {
        const { data } = await apiPublico.get<EnvelopeLayoutVersaoPagina>(
          `/layout/versoes/${versaoSlug}`,
        )
        return data.data
      } catch (error) {
        throw classificarErro(error) ?? error
      }
    },
    enabled: versaoSlug.length > 0,
    placeholderData: manterAnterior ? keepPreviousData : undefined,
    staleTime: DEZ_MINUTOS_MS,
    retry: (contagem, erro) => devoRetentar(contagem, erro),
  })
}
