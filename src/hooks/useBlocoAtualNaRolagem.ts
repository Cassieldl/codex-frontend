import { useCallback, useEffect, useRef, useState } from 'react'

import { blocoNaLinhaDeLeitura } from '../utils/blocoNaLinhaDeLeitura'
import type { PosicaoDoBloco } from '../utils/blocoNaLinhaDeLeitura'

/** Altura da linha de leitura, como fração da janela a partir do topo. */
const FRACAO_DA_LINHA_DE_LEITURA = 0.25

/** Rolagem que ainda conta como a posição do salto pelo índice. */
const TOLERANCIA_DA_ROLAGEM_PX = 4

export interface BlocoAtualNaRolagem {
  /** Bloco em leitura; sem medição ainda, o primeiro da lista. */
  raizAtual: string | null
  /** Bloco escolhido pelo índice: vale até a próxima rolagem de quem lê. */
  marcarBloco: (raiz: string) => void
}

function medirPosicoes(raizes: readonly string[]): PosicaoDoBloco[] {
  return raizes.flatMap((raiz) => {
    const bloco = document.getElementById(`bloco-${raiz}`)
    return bloco ? [{ raiz, topo: bloco.getBoundingClientRect().top }] : []
  })
}

/**
 * Bloco da lista (`#bloco-{raiz}`) que está na linha de leitura da janela. O salto pelo índice
 * fixa o bloco escolhido: perto do fim da página, um bloco curto nunca alcança a linha.
 */
export function useBlocoAtualNaRolagem(raizes: readonly string[]): BlocoAtualNaRolagem {
  const [raizDaRolagem, setRaizDaRolagem] = useState<string | null>(null)
  const raizesRef = useRef(raizes)
  const escolhaRef = useRef<{ raiz: string; rolagem: number } | null>(null)

  useEffect(() => {
    raizesRef.current = raizes
  }, [raizes])

  useEffect(() => {
    let quadro = 0

    function medir() {
      quadro = 0

      const escolha = escolhaRef.current
      if (escolha && Math.abs(window.scrollY - escolha.rolagem) <= TOLERANCIA_DA_ROLAGEM_PX) return
      escolhaRef.current = null

      const linhaDeLeitura = window.innerHeight * FRACAO_DA_LINHA_DE_LEITURA
      setRaizDaRolagem(blocoNaLinhaDeLeitura(medirPosicoes(raizesRef.current), linhaDeLeitura))
    }

    function agendarMedicao() {
      if (quadro === 0) quadro = requestAnimationFrame(medir)
    }

    window.addEventListener('scroll', agendarMedicao, { passive: true })
    window.addEventListener('resize', agendarMedicao)

    return () => {
      window.removeEventListener('scroll', agendarMedicao)
      window.removeEventListener('resize', agendarMedicao)
      if (quadro !== 0) cancelAnimationFrame(quadro)
    }
  }, [])

  const marcarBloco = useCallback((raiz: string) => {
    escolhaRef.current = { raiz, rolagem: window.scrollY }
    setRaizDaRolagem(raiz)
  }, [])

  const raizAtual =
    raizDaRolagem !== null && raizes.includes(raizDaRolagem) ? raizDaRolagem : (raizes[0] ?? null)

  return { raizAtual, marcarBloco }
}
