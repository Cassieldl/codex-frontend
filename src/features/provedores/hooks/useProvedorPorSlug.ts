import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { apiPublico } from '../../../services/api'
import { devoRetentar } from '../../../utils/retentativaDeQuery'
import type { ProvedorDetalhe } from '../types/provedor'
import { exigirAvisosPublicos } from '../utils/exigirAvisosPublicos'
import { provedoresKeys } from './provedoresKeys'

interface EnvelopeProvedorDetalhe {
  data: ProvedorDetalhe
  message: string | null
}

export type TipoErroProvedor = 'nao_encontrado' | 'despublicado'

/**
 * Erro tipado por status HTTP — P3 distingue `404`/`410`
 * (`analise-backend.md` §4.1/§4.4, M7): nunca `404` mudo para conteúdo que
 * existe mas está em rascunho.
 *
 * Não há ramo de `308` aqui — nunca chega ao cliente. `XMLHttpRequest` segue
 * redirects transparentemente e não expõe status 3xx nem `Location`; a
 * própria doc do axios registra `maxRedirects` como opção exclusiva do
 * adapter `http` (Node), porque o adapter `xhr` não tem como implementá-la.
 * `apiPublico` é axios puro (`services/api.ts`) → adapter XHR no browser.
 * Um `if (status === 308)` aqui seria um ramo morto que parece tratar o
 * caso — pior que ramo nenhum (`arquitetura.md` §5.F/PQ-01). O slug
 * desatualizado é descoberto comparando o canônico do payload contra a URL
 * atual, em `corrigirUrlCanonica` (usado por `routes/provedores/$provedorSlug/route.tsx`).
 */
export class ErroProvedorHttp extends Error {
  readonly tipo: TipoErroProvedor
  readonly status: number

  constructor(tipo: TipoErroProvedor, status: number) {
    super(`Provedor: erro ${tipo} (status ${status})`)
    this.name = 'ErroProvedorHttp'
    this.tipo = tipo
    this.status = status
  }
}

function classificarErro(error: unknown): ErroProvedorHttp | null {
  if (!isAxiosError(error)) return null
  const status = error.response?.status

  if (status === 404) return new ErroProvedorHttp('nao_encontrado', 404)
  if (status === 410) return new ErroProvedorHttp('despublicado', 410)
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
        exigirAvisosPublicos(data.data.avisos)
        return data.data
      } catch (error) {
        throw classificarErro(error) ?? error
      }
    },
    enabled: provedorSlug.length > 0,
    staleTime: DEZ_MINUTOS_MS,
    retry: (contagem, erro) =>
      devoRetentar(contagem, erro instanceof ErroProvedorHttp ? erro : null),
  })
}
