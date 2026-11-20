import { useEffect } from 'react'

/**
 * Mantém um `<link rel="canonical">` apontando para `href` enquanto a página
 * estiver montada (PQ-15/§3.1). Mesmo padrão de `useNoIndex`: cria a tag no
 * efeito e remove no cleanup, sem depender de nenhuma lib de head.
 *
 * `href` vem sempre de `ArtigoDetalhe.urlCanonica` - nunca de
 * `window.location`, que carregaria parâmetros de origem/telemetria (PQ-10)
 * para dentro do canonical.
 */
export function useLinkCanonico(href: string | undefined) {
  useEffect(() => {
    if (!href) return

    const link = document.createElement('link')
    link.rel = 'canonical'
    link.href = href
    document.head.appendChild(link)

    return () => {
      document.head.removeChild(link)
    }
  }, [href])
}
