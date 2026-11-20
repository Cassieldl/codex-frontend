import { useEffect, useState } from 'react'
import { caminhoDoProvedor } from './caminhoDoProvedor'

const PREFIXO_ANCORA_EXEMPLO = 'exemplo-'

/** Constrói o `id` do bloco de um exemplo na página do provedor (`#exemplo-{slug}`). */
export function construirIdExemplo(exemploSlug: string): string {
  return `${PREFIXO_ANCORA_EXEMPLO}${exemploSlug}`
}

/** Extrai o slug do exemplo a partir de um hash de URL (`#exemplo-{slug}` → `{slug}`). */
export function extrairSlugDoExemploNoHash(hash: string): string | null {
  const semSustenido = hash.replace(/^#/, '')
  if (!semSustenido.startsWith(PREFIXO_ANCORA_EXEMPLO)) return null

  const slug = semSustenido.slice(PREFIXO_ANCORA_EXEMPLO.length)
  return slug.length > 0 ? slug : null
}

/**
 * Link estável de um exemplo, o valor que o botão "Copiar link" entrega: o endereço do provedor
 * mais a âncora do cenário, nunca uma rota própria, porque exemplo não tem página (decisão C4).
 */
export function construirLinkExemplo(
  origem: string,
  provedorSlug: string,
  exemploSlug: string,
): string {
  return `${origem}${caminhoDoProvedor(provedorSlug)}#${construirIdExemplo(exemploSlug)}`
}

/**
 * Slug do exemplo pedido pela âncora da URL, reagindo também a mudanças de
 * hash depois da montagem (`hashchange`) - espelha `useCampoDestacadoPorAncora`
 * de `destaqueAncora.ts`, que não é editado aqui (arquivo compartilhado).
 *
 * Quem chega por `#exemplo-{slug}` precisa ver o XML, não um acordeão fechado:
 * o link copiável só cumpre a promessa se abrir o cenário que ele aponta.
 */
export function useExemploDestacadoPorAncora(): string | null {
  const [hash, setHash] = useState<string>(() =>
    typeof window === 'undefined' ? '' : window.location.hash,
  )

  useEffect(() => {
    function aoMudarHash() {
      setHash(window.location.hash)
    }
    window.addEventListener('hashchange', aoMudarHash)
    return () => window.removeEventListener('hashchange', aoMudarHash)
  }, [])

  return extrairSlugDoExemploNoHash(hash)
}
