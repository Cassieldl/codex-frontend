import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { apiPublico } from '../../../services/api'
import type { ProvedorDetalhe } from '../types/provedor'
import { provedoresKeys } from './provedoresKeys'

interface EnvelopeProvedorDetalhe {
  data: ProvedorDetalhe
  message: string | null
}

export type TipoErroProvedor = 'nao_encontrado' | 'despublicado' | 'movido'

/**
 * Erro tipado por status HTTP — P3 distingue `404`/`410`/`308`
 * (`analise-backend.md` §4.1/§4.4, M7): nunca `404` mudo para conteúdo que
 * existe mas está em rascunho.
 */
export class ErroProvedorHttp extends Error {
  readonly tipo: TipoErroProvedor
  readonly status: number
  readonly slugNovo?: string

  constructor(tipo: TipoErroProvedor, status: number, slugNovo?: string) {
    super(`Provedor: erro ${tipo} (status ${status})`)
    this.name = 'ErroProvedorHttp'
    this.tipo = tipo
    this.status = status
    this.slugNovo = slugNovo
  }
}

function classificarErro(error: unknown): ErroProvedorHttp | null {
  if (!isAxiosError(error)) return null
  const status = error.response?.status

  if (status === 404) return new ErroProvedorHttp('nao_encontrado', 404)
  if (status === 410) return new ErroProvedorHttp('despublicado', 410)
  if (status === 308) {
    const location = error.response?.headers?.location
    return new ErroProvedorHttp('movido', 308, typeof location === 'string' ? location : undefined)
  }
  return null
}

const DEZ_MINUTOS_MS = 1000 * 60 * 10

/**
 * `GET /provedores/{provedorSlug}` (P3, `analise-backend.md` §4.1) —
 * identidade do provedor + avisos de provedor (U8) + lista de versões
 * publicadas, **sem** "vigente" (U7). Usado pelo layout compartilhado
 * (`route.tsx`) e reaproveitado — mesma `queryKey` — pelas duas sub-rotas.
 */
export function useProvedorPorSlug(provedorSlug: string) {
  return useQuery({
    queryKey: provedoresKeys.detail(provedorSlug),
    queryFn: async () => {
      try {
        const { data } = await apiPublico.get<EnvelopeProvedorDetalhe>(
          `/provedores/${provedorSlug}`,
        )
        return data.data
      } catch (error) {
        throw classificarErro(error) ?? error
      }
    },
    enabled: provedorSlug.length > 0,
    staleTime: DEZ_MINUTOS_MS,
  })
}
