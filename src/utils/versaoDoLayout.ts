const PREFIXO_DE_VERSAO = /^vers[aã]o(\s+|$)/i

interface OpcoesDeVersaoDoLayout {
  /** "Versão 8" em vez de "versão 8": início de frase ou de rótulo. */
  maiuscula?: boolean
}

/** "Versão 8" e "8" → "8". Serve a qualquer rótulo de versão do cadastro, de layout ou de provedor. */
export function extrairNumeroDaVersao(rotulo: string): string {
  return rotulo.trim().replace(PREFIXO_DE_VERSAO, '').trim()
}

/**
 * "8" → "versão 8". O rótulo vem do cadastro e pode já trazer a palavra ("Versão 8"); ela nunca é
 * repetida. Onde o texto ao redor já diz "versão", use o rótulo cru em vez deste helper.
 */
export function formatarVersaoLayout(rotulo: string, opcoes: OpcoesDeVersaoDoLayout = {}): string {
  const numero = extrairNumeroDaVersao(rotulo)
  if (!numero) return ''

  return `${opcoes.maiuscula ? 'Versão' : 'versão'} ${numero}`
}
