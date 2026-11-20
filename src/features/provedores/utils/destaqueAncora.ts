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
 * qualquer render: a única lógica de frontend necessária é reagir ao
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
    function aoLimparAncora() {
      setHash('')
    }
    window.addEventListener('hashchange', aoMudarHash)
    window.addEventListener(EVENTO_ANCORA_DE_CAMPO_LIMPA, aoLimparAncora)
    return () => {
      window.removeEventListener('hashchange', aoMudarHash)
      window.removeEventListener(EVENTO_ANCORA_DE_CAMPO_LIMPA, aoLimparAncora)
    }
  }, [])

  return extrairSlugDoHash(hash)
}

/** Avisa só quem lê a âncora de campo; um `hashchange` acordaria os outros ouvintes da página. */
export const EVENTO_ANCORA_DE_CAMPO_LIMPA = 'codex:ancora-de-campo-limpa'

/** Troca a URL atual pela mesma sem o hash. */
export type TrocarUrlSemAncora = (urlSemAncora: string) => void

function trocarNoHistorico(urlSemAncora: string) {
  window.history.replaceState(window.history.state, '', urlSemAncora)
}

/**
 * Tira `#campo-…` da URL e avisa o leitor da âncora, para que o mesmo link possa ser seguido de
 * novo. Com o router montado, a troca precisa ir por ele: o `replaceState` direto faz o router
 * recarregar a rota e levar a página ao topo.
 */
export function limparAncoraDeCampo(trocarUrl: TrocarUrlSemAncora = trocarNoHistorico): void {
  if (extrairSlugDoHash(window.location.hash) === null) return

  const { pathname, search } = window.location
  trocarUrl(pathname + search)
  window.dispatchEvent(new Event(EVENTO_ANCORA_DE_CAMPO_LIMPA))
}
