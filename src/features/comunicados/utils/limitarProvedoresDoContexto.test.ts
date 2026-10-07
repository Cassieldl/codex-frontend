import { describe, expect, it } from 'vitest'
import { limitarProvedoresDoContexto } from './limitarProvedoresDoContexto'

describe('limitarProvedoresDoContexto', () => {
  it('descarta slug repetido e mantém a ordem de chegada', () => {
    expect(limitarProvedoresDoContexto(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c'])
  })

  it('corta nos 10 primeiros distintos', () => {
    const slugs = Array.from({ length: 12 }, (_, indice) => `provedor-${indice + 1}`)

    expect(limitarProvedoresDoContexto(slugs)).toEqual(slugs.slice(0, 10))
  })

  it('conta só os distintos para o teto: 12 versões de 2 provedores não perdem nenhum', () => {
    const slugs = Array.from({ length: 12 }, (_, indice) => (indice % 2 === 0 ? 'a' : 'b'))

    expect(limitarProvedoresDoContexto(slugs)).toEqual(['a', 'b'])
  })

  it('sem provedor, devolve lista vazia', () => {
    expect(limitarProvedoresDoContexto([])).toEqual([])
  })
})
