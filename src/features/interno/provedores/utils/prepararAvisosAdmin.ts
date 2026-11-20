import { comEtagDeConcorrenciaNaColecao } from '../../utils/etagDeConcorrencia'
import type { AvisoAdmin } from '../types/avisoAdmin'

/**
 * Deriva o `etag` de cada aviso e exige que `camposAfetadosIds` tenha chegado.
 *
 * Aqui a ausência é mais perigosa que no portal: o formulário de edição pré-seleciona os campos a
 * partir dessa lista e envia o resultado em `campoVersaoIds`, que **substitui** o que está gravado.
 * Se o campo faltasse e virasse `[]`, salvar um aviso - sem tocar nos campos - apagaria os vínculos
 * em silêncio. Então falha e nomeia o que faltou.
 */
export function prepararAvisosAdmin(
  avisos: readonly AvisoAdmin[] | null | undefined,
): (AvisoAdmin & { etag: string })[] {
  const avisosComEtag = comEtagDeConcorrenciaNaColecao(avisos, 'avisos')

  for (const aviso of avisosComEtag) {
    if (!Array.isArray(aviso.camposAfetadosIds))
      throw new Error(
        `O aviso ${aviso.id} da API não trouxe a coleção "camposAfetadosIds", que o contrato exige.`,
      )
  }

  return avisosComEtag
}
