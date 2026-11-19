import { describe, expect, it } from 'vitest'

import { blocoNaLinhaDeLeitura } from './blocoNaLinhaDeLeitura'

const LINHA = 200

describe('blocoNaLinhaDeLeitura', () => {
  it('escolhe o bloco que começou mais perto da linha sem passar dela', () => {
    const posicoes = [
      { raiz: 'rps', topo: -900 },
      { raiz: 'servico', topo: 150 },
      { raiz: 'tomador', topo: 640 },
    ]

    expect(blocoNaLinhaDeLeitura(posicoes, LINHA)).toBe('servico')
  })

  it('antes de qualquer bloco chegar à linha, vale o primeiro da página', () => {
    const posicoes = [
      { raiz: 'servico', topo: 700 },
      { raiz: 'rps', topo: 320 },
      { raiz: 'tomador', topo: 1100 },
    ]

    expect(blocoNaLinhaDeLeitura(posicoes, LINHA)).toBe('rps')
  })

  it('bloco exatamente na linha já conta como atual', () => {
    const posicoes = [
      { raiz: 'rps', topo: -300 },
      { raiz: 'servico', topo: LINHA },
    ]

    expect(blocoNaLinhaDeLeitura(posicoes, LINHA)).toBe('servico')
  })

  it('sem bloco medido, não há bloco atual', () => {
    expect(blocoNaLinhaDeLeitura([], LINHA)).toBeNull()
  })
})
