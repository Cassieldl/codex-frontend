import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { apiPublico } from '../../../services/api'
import { devoRetentar } from '../../../utils/retentativaDeQuery'
import type { AlcanceDoEnvioModelo, EnvioModelo } from '../types/envioModelo'
import { provedoresKeys } from './provedoresKeys'

interface EnvelopeEnvioModelo {
  data: EnvioModelo
  message: string | null
}

export type MotivoEnvioModeloIndisponivel = 'estrutura_indisponivel' | 'nao_encontrado'

/**
 * 404 do envio modelo. Nenhum dos dois melhora com nova tentativa: o layout sem estrutura
 * (`ESTRUTURA_INDISPONIVEL`) ou a versão que saiu do ar entre a página e esta consulta.
 */
export class ErroEnvioModeloIndisponivel extends Error {
  readonly status = 404
  readonly motivo: MotivoEnvioModeloIndisponivel

  constructor(motivo: MotivoEnvioModeloIndisponivel) {
    super(`EnvioModelo: ${motivo} (status 404)`)
    this.name = 'ErroEnvioModeloIndisponivel'
    this.motivo = motivo
  }
}

// O código vem em `{ error: { code } }` no envelope da API ou em `code` no ProblemDetails.
function codigoDoErro(corpo: unknown): string | null {
  if (typeof corpo !== 'object' || corpo === null) return null
  const registro = corpo as Record<string, unknown>
  if (typeof registro.code === 'string') return registro.code

  const envelope = registro.error
  if (typeof envelope !== 'object' || envelope === null) return null
  const codigo = (envelope as Record<string, unknown>).code
  return typeof codigo === 'string' ? codigo : null
}

function classificarErro(error: unknown): ErroEnvioModeloIndisponivel | null {
  if (!isAxiosError(error) || error.response?.status !== 404) return null

  return codigoDoErro(error.response.data) === 'ESTRUTURA_INDISPONIVEL'
    ? new ErroEnvioModeloIndisponivel('estrutura_indisponivel')
    : new ErroEnvioModeloIndisponivel('nao_encontrado')
}

const DEZ_MINUTOS_MS = 1000 * 60 * 10

/**
 * `GET /provedores/{provedorSlug}/versoes/{versaoSlug}/envio-modelo?alcance=`. Cada alcance tem
 * a sua entrada de cache: voltar ao alcance já visto não busca de novo.
 */
export function useEnvioModelo(
  provedorSlug: string,
  versaoSlug: string,
  alcance: AlcanceDoEnvioModelo,
) {
  return useQuery({
    queryKey: provedoresKeys.envioModelo(provedorSlug, versaoSlug, alcance),
    queryFn: async () => {
      try {
        const { data } = await apiPublico.get<EnvelopeEnvioModelo>(
          `/provedores/${provedorSlug}/versoes/${versaoSlug}/envio-modelo`,
          { params: { alcance } },
        )
        return data.data
      } catch (error) {
        throw classificarErro(error) ?? error
      }
    },
    enabled: provedorSlug.length > 0 && versaoSlug.length > 0,
    staleTime: DEZ_MINUTOS_MS,
    retry: (contagem, erro) => devoRetentar(contagem, erro),
  })
}
