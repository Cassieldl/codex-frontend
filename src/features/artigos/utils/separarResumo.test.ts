import { describe, expect, it } from 'vitest'
import { separarResumo } from './separarResumo'

describe('separarResumo', () => {
  it('tira a citação [!RESUMO] do início e devolve o resto do corpo', () => {
    const corpo = '> [!RESUMO]\n> Primeira linha.\n> Segunda linha.\n\n## Seção\n\nTexto.'

    expect(separarResumo(corpo)).toEqual({
      resumo: '> [!RESUMO]\n> Primeira linha.\n> Segunda linha.',
      restante: '## Seção\n\nTexto.',
    })
  })

  it('resumo que não abre o corpo fica onde está', () => {
    const corpo = 'Introdução.\n\n> [!RESUMO]\n> Resumo tardio.'

    expect(separarResumo(corpo)).toEqual({ resumo: null, restante: corpo })
  })

  it('outra citação no início não é resumo', () => {
    const corpo = '> [!DICA]\n> Confira o lote.'

    expect(separarResumo(corpo)).toEqual({ resumo: null, restante: corpo })
  })
})
