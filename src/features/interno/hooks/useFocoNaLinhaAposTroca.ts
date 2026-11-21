import { useCallback, useEffect, useRef } from 'react'

/** Para onde o foco volta numa linha: o menu de mais ações, senão a última ação habilitada. */
function alvoDeFocoNaLinha(linha: HTMLElement): HTMLElement | null {
  const menu = linha.querySelector<HTMLElement>('[aria-haspopup="menu"]')
  if (menu) return menu

  const acoes = linha.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')
  return acoes[acoes.length - 1] ?? null
}

/**
 * Publicar e despublicar trocam os botões da linha quando a lista relida chega: o botão que tinha
 * o foco some e o foco cairia no body. Depois do sucesso, este hook espera os dados novos e devolve
 * o foco à linha, sem roubá-lo se ele já estiver nela.
 */
export function useFocoNaLinhaAposTroca(dados: unknown): (idDaLinha: string) => void {
  const linhaPendenteRef = useRef<string | null>(null)
  const dadosAoMarcarRef = useRef<unknown>(null)

  useEffect(() => {
    const idDaLinha = linhaPendenteRef.current
    if (!idDaLinha || dados === dadosAoMarcarRef.current) return

    linhaPendenteRef.current = null
    const linha = document.getElementById(idDaLinha)
    if (!linha || linha.contains(document.activeElement)) return

    alvoDeFocoNaLinha(linha)?.focus()
  }, [dados])

  return useCallback(
    (idDaLinha: string) => {
      linhaPendenteRef.current = idDaLinha
      dadosAoMarcarRef.current = dados
    },
    [dados],
  )
}
