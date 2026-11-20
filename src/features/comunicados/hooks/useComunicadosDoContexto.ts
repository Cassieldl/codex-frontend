import { useQuery } from '@tanstack/react-query'
import { apiPublico } from '../../../services/api'
import { ehColecao } from '../../../utils/ehColecao'
import type { ComunicadoContexto, ContextoDeComunicados } from '../types/comunicadoContexto'
import { limitarProvedoresDoContexto } from '../utils/limitarProvedoresDoContexto'
import { comunicadosKeys } from './comunicadosKeys'

/**
 * `GET /comunicados` - `ApiResponse<ComunicadoPublicoDto[]>`, **enveloped em `data`**
 * (as listagens públicas de provedor e artigo vêm cruas; esta não).
 */
interface EnvelopeComunicados {
  data: ComunicadoContexto[]
}

/**
 * Curto de propósito, igual ao `Cache-Control` do servidor: comunicado vence pela passagem do
 * tempo, sem que nenhuma linha mude, então cache longo no cliente o manteria no ar depois de
 * vencido.
 */
const UM_MINUTO_MS = 1000 * 60

function exigirComunicados(
  comunicados: readonly ComunicadoContexto[] | null | undefined,
): readonly ComunicadoContexto[] {
  if (!ehColecao(comunicados))
    throw new Error('A resposta da API não trouxe a coleção "comunicados", que o contrato exige.')

  return comunicados
}

/**
 * Comunicados no ar para o contexto da página: globais, os do provedor e os das versões dele. Com
 * `versaoSlug`, só os da versão aberta. O parâmetro `provedor` se repete na URL
 * (`provedor=a&provedor=b`), formato que o servidor lê - por isso `URLSearchParams`, e não o
 * `provedor[]=a` que o axios gera para um array.
 *
 * A versão só vai junto de exatamente um provedor: o slug dela é único por provedor, e o servidor
 * recusa o resto com `400`.
 *
 * Sem `retry`: o comunicado é secundário na página, e quem não o obtém vê o aviso discreto com
 * "Tentar novamente" em vez de esperar o backoff.
 */
export function useComunicadosDoContexto({ provedorSlugs, versaoSlug }: ContextoDeComunicados) {
  const provedores = limitarProvedoresDoContexto(provedorSlugs)
  const versao = provedores.length === 1 ? (versaoSlug ?? null) : null

  return useQuery({
    queryKey: comunicadosKeys.contexto(provedores, versao),
    queryFn: async () => {
      const params = new URLSearchParams()
      provedores.forEach((slug) => params.append('provedor', slug))
      if (versao) params.append('versao', versao)

      const { data } = await apiPublico.get<EnvelopeComunicados>('/comunicados', { params })
      return exigirComunicados(data.data)
    },
    staleTime: UM_MINUTO_MS,
    retry: false,
  })
}
