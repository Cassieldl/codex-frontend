import { extrairNumeroDaVersao } from '../../../utils/versaoDoLayout'

export interface LayoutDoProvedor {
  texto: string
  /** A versão do provedor foi escrita contra um layout que já não é o vigente. */
  desatualizado: boolean
}

/**
 * Texto do chip "Layout InvoiCy N" da página do provedor. Sem vigente conhecida (índice falhou,
 * carregando ou sem versão vigente publicada), o chip sai sem alerta: não há com o que comparar.
 */
export function descreverLayoutDoProvedor(
  versaoLayoutRotulo: string,
  vigenteRotulo: string | null,
): LayoutDoProvedor {
  const numero = extrairNumeroDaVersao(versaoLayoutRotulo)
  const texto = `Layout InvoiCy ${numero}`
  const numeroVigente = vigenteRotulo ? extrairNumeroDaVersao(vigenteRotulo) : ''

  if (!numeroVigente || numeroVigente === numero) return { texto, desatualizado: false }

  return { texto: `${texto}, vigente é a ${numeroVigente}`, desatualizado: true }
}
