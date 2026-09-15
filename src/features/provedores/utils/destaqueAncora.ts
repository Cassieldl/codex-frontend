import { useEffect, useState } from 'react'

const PREFIXO_ANCORA_CAMPO = 'campo-'

/** Constrói o `id` da linha de um campo na tabela (`#campo-{slug}`). */
export function construirIdLinhaCampo(campoLayoutSlug: string): string {
  return `${PREFIXO_ANCORA_CAMPO}${campoLayoutSlug}`
}

/** Extrai o slug do campo a partir de um hash de URL (`#campo-{slug}` → `{slug}`). */
export function extrairSlugDoHash(hash: string): string | null {
  const semSustenido = hash.replace(/^#/, '')
  if (!semSustenido.startsWith(PREFIXO_ANCORA_CAMPO)) return null

  const slug = semSustenido.slice(PREFIXO_ANCORA_CAMPO.length)
  return slug.length > 0 ? slug : null
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
