import type { AvisoPublico } from '../types/provedor'
import { ehColecao } from '../../../utils/ehColecao'

/**
 * Confere, na fronteira com a API, que `avisos` chegou e que cada aviso traz `camposAfetados` como
 * lista de objetos.
 *
 * As duas são coleções obrigatórias no contrato (`[]` quando não há nada). Se uma não chega -
 * servidor anterior ao campo, resposta lida no nível errado, ou a forma antiga (`string[]`) -
 * seguir com lista vazia faria a seção sumir sem aviso, e os nomes antigos virariam `undefined` na
 * tela. Então falha e nomeia o que faltou: a página mostra o estado de erro e o console diz qual
 * campo do contrato não veio.
 */
export function exigirAvisosPublicos(
  avisos: readonly AvisoPublico[] | null | undefined,
): readonly AvisoPublico[] {
  if (!ehColecao(avisos))
    throw new Error('A resposta da API não trouxe a coleção "avisos", que o contrato exige.')

  for (const aviso of avisos) {
    const camposAfetados: unknown = aviso.camposAfetados
    const formaValida =
      Array.isArray(camposAfetados) &&
      camposAfetados.every((campo) => typeof campo === 'object' && campo !== null)

    if (!formaValida)
      throw new Error(
        `O aviso ${aviso.id} da API não trouxe a coleção "camposAfetados" como lista de campos, que o contrato exige.`,
      )
  }

  return avisos
}
