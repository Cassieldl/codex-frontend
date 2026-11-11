import { describe, expect, it } from 'vitest'
import { lerNotaDaVersaoLayout } from './notaDaVersaoLayout'

describe('lerNotaDaVersaoLayout', () => {
  it('separa o resumo dos tópicos "Rótulo: texto", na ordem da nota', () => {
    const nota = lerNotaDaVersaoLayout(
      'InvoiCy 3.3.0.0 (NT 009 v1.01).\nGrupos novos: Condominio\n\nCampos novos: DestIE\nSaíram: ValServEst',
    )

    expect(nota.resumo).toBe('InvoiCy 3.3.0.0 (NT 009 v1.01).')
    expect(nota.topicos).toEqual([
      { rotulo: 'Grupos novos', texto: 'Condominio' },
      { rotulo: 'Campos novos', texto: 'DestIE' },
      { rotulo: 'Saíram', texto: 'ValServEst' },
    ])
  })

  it('nota em parágrafo único vira só resumo, mesmo com dois-pontos no meio da frase', () => {
    const texto =
      'Layout de recepção, versão 8. InvoiCy 3.1.0.0: ajustes conforme a NT009 com uma frase longa que passa do limite de um rótulo.'

    expect(lerNotaDaVersaoLayout(texto)).toEqual({ resumo: texto, topicos: [] })
  })

  it('sem nota, nada a mostrar', () => {
    expect(lerNotaDaVersaoLayout(null)).toEqual({ resumo: null, topicos: [] })
  })
})
