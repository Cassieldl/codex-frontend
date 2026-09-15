import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { apiPublico } from '../../../services/api'
import type { VersaoProvedorPagina } from '../types/versaoProvedorPagina'
import { provedoresKeys } from './provedoresKeys'

interface EnvelopeVersaoProvedorPagina {
  data: VersaoProvedorPagina
  message: string | null
}

export type TipoErroVersaoProvedor =
  'nao_encontrado' | 'versao_despublicada' | 'provedor_despublicado' | 'limite_excedido'

interface EnvelopeErroComCodigo {
  error?: { code?: string }
}

/**
 * Erro tipado por status + código do envelope — P4 distingue **qual
 * ancestral** falhou no `410` (`VERSAO_DESPUBLICADA` vs `PROVEDOR_DESPUBLICADO`,
 * `analise-backend.md` §4.4/M7): o texto da página de "saiu do ar" depende
 * de qual dos dois aconteceu.
 */
export class ErroVersaoProvedorHttp extends Error {
  readonly tipo: TipoErroVersaoProvedor
  readonly status: number

  constructor(tipo: TipoErroVersaoProvedor, status: number) {
    super(`VersaoProvedor: erro ${tipo} (status ${status})`)
    this.name = 'ErroVersaoProvedorHttp'
    this.tipo = tipo
    this.status = status
  }
}

function classificarErro(error: unknown): ErroVersaoProvedorHttp | null {
  if (!isAxiosError(error)) return null
  const status = error.response?.status
  const codigo = (error.response?.data as EnvelopeErroComCodigo | undefined)?.error?.code

  if (status === 404) return new ErroVersaoProvedorHttp('nao_encontrado', 404)
  if (status === 422) return new ErroVersaoProvedorHttp('limite_excedido', 422)
  if (status === 410) {
    return codigo === 'PROVEDOR_DESPUBLICADO'
      ? new ErroVersaoProvedorHttp('provedor_despublicado', 410)
      : new ErroVersaoProvedorHttp('versao_despublicada', 410)
  }
  return null
}

const DEZ_MINUTOS_MS = 1000 * 60 * 10

/**
 * `GET /provedores/{provedorSlug}/versoes/{versaoSlug}` (P4) — agregado da
 * tela mais densa do portal (`VersaoProvedorPagina`, `analise-backend.md`
 * §4.3). `queryKey` inclui os dois slugs — trocar de aba é navegação de
 * rota, nunca estado local (§7.6.1), e cada combinação é uma entrada de
 * cache própria.
 */
export function useVersaoProvedor(provedorSlug: string, versaoSlug: string) {
  return useQuery({
    queryKey: provedoresKeys.versao(provedorSlug, versaoSlug),
    queryFn: async () => {
      try {
        const { data } = await apiPublico.get<EnvelopeVersaoProvedorPagina>(
          `/provedores/${provedorSlug}/versoes/${versaoSlug}`,
        )
        return data.data
      } catch (error) {
        throw classificarErro(error) ?? error
      }
    },
    enabled: provedorSlug.length > 0 && versaoSlug.length > 0,
    staleTime: DEZ_MINUTOS_MS,
  })
}
