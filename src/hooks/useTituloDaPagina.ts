import { useEffect } from 'react'

/** Título da aba enquanto a página carrega e fora das telas que definem o seu. Igual ao do `index.html`. */
export const TITULO_PADRAO = 'Portal Técnico de Integração NFS-e | Codex'

export function montarTituloDaPagina(assunto: string): string {
  return `${assunto} | Codex`
}

/**
 * Põe "<assunto> | Codex" na aba enquanto o componente estiver montado e volta ao título padrão
 * quando ele sai ou o assunto muda.
 *
 * `null` quer dizer "esta tela ainda não tem assunto" (carregando, ou quem decide é um estado
 * filho, como a página de "não existe"): o hook não mexe no título. Só uma tela por vez o define,
 * porque o efeito do filho roda antes do efeito do pai e o pai o sobrescreveria.
 */
export function useTituloDaPagina(assunto: string | null) {
  const assuntoLimpo = assunto?.trim() || null

  useEffect(() => {
    if (!assuntoLimpo) return

    document.title = montarTituloDaPagina(assuntoLimpo)

    return () => {
      document.title = TITULO_PADRAO
    }
  }, [assuntoLimpo])
}
