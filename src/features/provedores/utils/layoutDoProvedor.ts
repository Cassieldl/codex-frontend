import { extrairNumeroDaVersao } from '../../../utils/versaoDoLayout'
import type { LayoutVersaoResumo } from '../../layout/types/layoutPublico'

type VersaoDoIndice = Pick<LayoutVersaoResumo, 'slug' | 'rotulo' | 'ordem'> & {
  obrigatoriaEm?: string | null
}

export interface IndiceParaComparar {
  vigente: VersaoDoIndice | null
  versoes: VersaoDoIndice[]
}

/** A versão vigente do layout, quando o mapeamento do provedor ficou para trás dela. */
export interface VigenteAFrente {
  slug: string
  rotulo: string
  obrigatoriaEm: string | null
}

/**
 * A vigente, quando o mapeamento do provedor segue uma versão anterior a ela; senão `null`. Sem
 * vigente conhecida (índice falhou ou sem versão vigente publicada) não há com o que comparar.
 * Versão do provedor que o índice não lista conta como anterior, porque é diferente da vigente.
 */
export function vigenteAFrenteDoProvedor(
  versaoLayoutRotulo: string,
  indice: IndiceParaComparar | undefined,
): VigenteAFrente | null {
  const vigente = indice?.vigente
  if (!vigente) return null

  const numero = extrairNumeroDaVersao(versaoLayoutRotulo)
  if (numero === extrairNumeroDaVersao(vigente.rotulo)) return null

  const doProvedor = indice.versoes.find(
    (versao) => extrairNumeroDaVersao(versao.rotulo) === numero,
  )
  if (doProvedor && doProvedor.ordem > vigente.ordem) return null

  return {
    slug: vigente.slug,
    rotulo: vigente.rotulo,
    obrigatoriaEm: vigente.obrigatoriaEm ?? null,
  }
}
