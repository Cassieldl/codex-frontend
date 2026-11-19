import type { CampoVersaoPublico } from '../types/versaoProvedorPagina'

export interface LinkDoCampoNoDicionario {
  to: '/layout/campos/$campoSlug'
  params: { campoSlug: string }
}

/**
 * Verbete do campo no Layout InvoiCy, pela URL estável que resolve a versão de exibição. `null`
 * quando o campo não tem correspondente no layout.
 */
export function linkDoCampoNoDicionario(
  campo: Pick<CampoVersaoPublico, 'campoLayoutSlug'>,
): LinkDoCampoNoDicionario | null {
  const campoSlug = campo.campoLayoutSlug.trim()
  if (!campoSlug) return null

  return { to: '/layout/campos/$campoSlug', params: { campoSlug } }
}
