export type AbaProvedor = 'erros' | 'campos' | 'natureza' | 'envio'

/** Rota de cada aba. Erros é a página principal do provedor. */
export const ROTA_DA_ABA = {
  erros: '/provedores/$provedorSlug',
  campos: '/provedores/$provedorSlug/campos',
  natureza: '/provedores/$provedorSlug/natureza-da-operacao',
  envio: '/provedores/$provedorSlug/envio-modelo',
} as const satisfies Record<AbaProvedor, string>

const SEGMENTO_DA_ABA: Record<Exclude<AbaProvedor, 'erros'>, string> = {
  campos: 'campos',
  natureza: 'natureza-da-operacao',
  envio: 'envio-modelo',
}

/**
 * Âncoras de antes das abas, quando tudo era uma página só. Links copiados, resultados da busca e
 * links de outras páginas continuam apontando para `/provedores/<slug>#...`.
 */
const ABA_POR_PREFIXO_DE_ANCORA: ReadonlyArray<readonly [string, AbaProvedor]> = [
  ['campo-', 'campos'],
  ['exemplo-', 'envio'],
]

const ABA_POR_ANCORA_EXATA: Readonly<Record<string, AbaProvedor>> = {
  avisos: 'erros',
  'erros-conhecidos': 'erros',
  campos: 'campos',
  'natureza-da-operacao': 'natureza',
  'envio-modelo': 'envio',
  exemplos: 'envio',
}

/** `%` solto na URL derruba o `decodeURIComponent`; aí vale a âncora como veio. */
function decodificarAncora(ancora: string): string {
  try {
    return decodeURIComponent(ancora)
  } catch {
    return ancora
  }
}

/** Aba dona da âncora, ou `null` quando a âncora não é de nenhuma aba (fica onde está). */
export function abaDoHash(hash: string): AbaProvedor | null {
  const ancora = decodificarAncora(hash.replace(/^#/, ''))
  if (!ancora) return null

  const exata = ABA_POR_ANCORA_EXATA[ancora]
  if (exata) return exata

  const porPrefixo = ABA_POR_PREFIXO_DE_ANCORA.find(([prefixo]) => ancora.startsWith(prefixo))

  return porPrefixo ? porPrefixo[1] : null
}

/**
 * Aba do endereço atual. `null` quando o endereço não é deste provedor: numa navegação para fora,
 * a página ainda está montada com a localização já no destino.
 */
export function abaDoCaminho(caminho: string, caminhoDoProvedor: string): AbaProvedor | null {
  const semBarraFinal = caminho.replace(/\/+$/, '')
  if (semBarraFinal === caminhoDoProvedor) return 'erros'
  if (!semBarraFinal.startsWith(`${caminhoDoProvedor}/`)) return null

  const segmento = semBarraFinal.slice(caminhoDoProvedor.length + 1)
  const aba = (Object.keys(SEGMENTO_DA_ABA) as Exclude<AbaProvedor, 'erros'>[]).find(
    (chave) => SEGMENTO_DA_ABA[chave] === segmento,
  )

  return aba ?? null
}
