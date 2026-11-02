import { useEffect, useState } from 'react'

const PREFIXO_ANCORA_CAMPO = 'campo-'

/** Constrói o `id` da linha de um campo na tabela (`#campo-{slug}`). */
export function construirIdLinhaCampo(campoLayoutSlug: string): string {
  return `${PREFIXO_ANCORA_CAMPO}${campoLayoutSlug}`
}

/** Extrai o slug do campo a partir de um hash de URL (`#campo-{slug}` → `{slug}`). */
export function extrairSlugDoHash(hash: string, prefixo = PREFIXO_ANCORA_CAMPO): string | null {
  const semSustenido = hash.replace(/^#/, '')
  if (!semSustenido.startsWith(prefixo)) return null

  const slug = semSustenido.slice(prefixo.length)
  return slug.length > 0 ? slug : null
}

const PREFIXO_ANCORA_ESTRUTURA = 'estrutura-'

/** `id` da linha de uma tag na estrutura XML/JSON do layout (`#estrutura-{slug}`). */
export function construirIdLinhaEstrutura(campoSlug: string): string {
  return `${PREFIXO_ANCORA_ESTRUTURA}${campoSlug}`
}

/** Aceita o hash com ou sem `#`: o router entrega sem. */
export function extrairSlugDaEstruturaDoHash(hash: string): string | null {
  return extrairSlugDoHash(hash, PREFIXO_ANCORA_ESTRUTURA)
}

/**
 * Hook de destaque de linha por âncora (§7.6.4, papel (d) do inventário
 * §3.3). O `versaoSlug` já está determinado pela própria rota antes de
 * qualquer render — a única lógica de frontend necessária é reagir ao
 * `location.hash`, inclusive quando ele muda depois da montagem
 * (`hashchange`), sem exigir novo fetch: a linha já está no DOM.
 */
export function useCampoDestacadoPorAncora(): string | null {
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

  return extrairSlugDoHash(hash)
}

/** Tira `#campo-…` da URL e avisa os ouvintes, para que o mesmo link possa ser seguido de novo. */
export function limparAncoraDeCampo(): void {
  if (extrairSlugDoHash(window.location.hash) === null) return

  const { pathname, search } = window.location
  window.history.replaceState(window.history.state, '', pathname + search)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
