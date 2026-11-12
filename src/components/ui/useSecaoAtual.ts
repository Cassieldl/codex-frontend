import { useEffect, useState } from 'react'

/** Distância do topo da janela a partir da qual um título conta como "a seção em leitura". */
export const LIMIAR_SECAO_ATUAL_PX = 96

/** Âncora do último título que passou do limiar; `null` antes do primeiro, quando o leitor está na introdução. */
export function useSecaoAtual(ancoras: string[], limiar = LIMIAR_SECAO_ATUAL_PX): string | null {
  const [atual, setAtual] = useState<string | null>(null)
  const chave = ancoras.join('|')

  useEffect(() => {
    const lista = chave ? chave.split('|') : []
    let quadro = 0

    function medir() {
      quadro = 0
      let encontrada: string | null = null
      // No fim da página o último título nunca chega ao topo: a última seção é a que se lê.
      const raiz = document.documentElement
      if (
        lista.length &&
        window.scrollY > 0 &&
        window.innerHeight + window.scrollY >= raiz.scrollHeight - 2
      ) {
        setAtual(lista.at(-1) ?? null)
        return
      }
      for (const ancora of lista) {
        const titulo = document.getElementById(ancora)
        if (titulo && titulo.getBoundingClientRect().top <= limiar) encontrada = ancora
      }
      setAtual(encontrada)
    }

    function agendar() {
      if (!quadro) quadro = requestAnimationFrame(medir)
    }

    medir()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', agendar)
    return () => {
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', agendar)
      if (quadro) cancelAnimationFrame(quadro)
    }
  }, [chave, limiar])

  return atual
}
