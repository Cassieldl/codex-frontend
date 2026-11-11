import { useEffect, useState } from 'react'

const PREFIXO_ANCORA_AVISO = 'aviso-'

/** Constrói o `id` do bloco de um aviso (`#aviso-{id}`). */
export function construirIdAviso(avisoId: number): string {
  return `${PREFIXO_ANCORA_AVISO}${avisoId}`
}

/** Extrai o id do aviso a partir de um hash de URL (`#aviso-12` → `12`). */
export function extrairIdDoAvisoNoHash(hash: string): number | null {
  const semSustenido = hash.replace(/^#/, '')
  if (!semSustenido.startsWith(PREFIXO_ANCORA_AVISO)) return null

  const sufixo = semSustenido.slice(PREFIXO_ANCORA_AVISO.length)
  return /^\d+$/.test(sufixo) ? Number(sufixo) : null
}

/**
 * Link estável de um aviso, o valor que o botão "Copiar link" entrega. É o endereço da página onde
 * o leitor está mais a âncora do aviso: aviso de provedor aparece em todas as abas do provedor, e
 * aviso de versão só na própria — nos dois casos a página atual é a que contém o aviso.
 */
export function construirLinkAviso(origem: string, caminho: string, avisoId: number): string {
  return `${origem}${caminho}#${construirIdAviso(avisoId)}`
}

/**
 * Id do aviso apontado pela âncora da URL, **só se ele pertence a esta lista**: a página tem duas
 * listas (provedor e versão) e cada uma destaca e rola até o que é seu.
 *
 * Reage também a mudanças de hash depois da montagem. A lista só monta depois que a página
 * carregou, então o `id` já existe no DOM quando o efeito roda — chegar por link copiado entrega
 * o aviso na tela, não o topo da página.
 */
export function useAvisoDestacadoPorAncora(avisos: readonly { id: number }[]): number | null {
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

  const avisoNoHash = extrairIdDoAvisoNoHash(hash)
  const avisoDestacado =
    avisoNoHash !== null && avisos.some((aviso) => aviso.id === avisoNoHash) ? avisoNoHash : null

  useEffect(() => {
    if (avisoDestacado === null) return
    document.getElementById(construirIdAviso(avisoDestacado))?.scrollIntoView({ block: 'start' })
  }, [avisoDestacado])

  return avisoDestacado
}

/** Âncora da área de avisos da página do provedor (`#avisos`), o destino dos avisos na busca. */
export const ID_AREA_AVISOS = 'avisos'

/**
 * Rola até a área de avisos quando a URL chega com `#avisos`. O navegador só rola sozinho se o
 * alvo existe no carregamento do documento, e aqui ele só monta depois que o provedor carregou.
 */
export function useRolarParaAreaDeAvisos(conteudoPronto: boolean): void {
  useEffect(() => {
    if (!conteudoPronto || window.location.hash !== `#${ID_AREA_AVISOS}`) return
    document.getElementById(ID_AREA_AVISOS)?.scrollIntoView?.({ block: 'start' })
  }, [conteudoPronto])
}
