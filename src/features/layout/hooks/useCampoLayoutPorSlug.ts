import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { apiPublico } from '../../../services/api'
import type { CampoLayoutVerbete } from '../types/layoutPublico'
import { layoutKeys } from './layoutKeys'

interface EnvelopeCampoLayoutVerbete {
  data: CampoLayoutVerbete
  message: string | null
}

export type TipoErroCampoLayout = 'nao_encontrado' | 'campo_despublicado'

/**
 * Erro tipado de P12. O `410` tem uma única causa observável: o campo não está
 * visível, seja porque saiu do ar, seja porque a versão que o exibia saiu. O
 * backend emite `CAMPO_LAYOUT_DESPUBLICADO` nos dois casos — `VERSAO_LAYOUT_DESPUBLICADA`
 * só sai em P11, sobre a versão inteira. Um ramo para ele aqui seria inalcançável.
 */
export class ErroCampoLayoutHttp extends Error {
  readonly tipo: TipoErroCampoLayout
  readonly status: number

  constructor(tipo: TipoErroCampoLayout, status: number) {
    super(`CampoLayout: erro ${tipo} (status ${status})`)
    this.name = 'ErroCampoLayoutHttp'
    this.tipo = tipo
    this.status = status
  }
}

function classificarErro(error: unknown): ErroCampoLayoutHttp | null {
  if (!isAxiosError(error)) return null
  const status = error.response?.status

  if (status === 404) return new ErroCampoLayoutHttp('nao_encontrado', 404)
  if (status === 410) return new ErroCampoLayoutHttp('campo_despublicado', 410)
  return null
}

const DEZ_MINUTOS_MS = 1000 * 60 * 10

/** `GET /layout/campos/{campoSlug}` (P12). Compartilhado pela resolução e pelos usos do campo. */
export async function buscarCampoLayout(campoSlug: string): Promise<CampoLayoutVerbete> {
  try {
    const { data } = await apiPublico.get<EnvelopeCampoLayoutVerbete>(`/layout/campos/${campoSlug}`)
    return data.data
  } catch (error) {
    throw classificarErro(error) ?? error
  }
}

/**
 * Resolve a URL canônica do campo (A3). A página de resolução usa só `versaoExibicao`, para
 * decidir **em qual versão** abrir o campo; ela redireciona e nunca renderiza o verbete nem lê
 * `ondeEUsado` — quem o lê é o modal do campo (`useUsosDoCampoLayout`).
 */
export function useCampoLayoutPorSlug(campoSlug: string) {
  return useQuery({
    queryKey: layoutKeys.campo(campoSlug),
    queryFn: () => buscarCampoLayout(campoSlug),
    enabled: campoSlug.length > 0,
    staleTime: DEZ_MINUTOS_MS,
  })
}
