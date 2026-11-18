import { describe, expect, it } from 'vitest'
import { recortarCamposDoBloco } from './recortarCamposDoBloco'

function subgrupo(chave: string, quantidade: number) {
  return { chave, campos: Array.from({ length: quantidade }, (_, indice) => `${chave}${indice}`) }
}

describe('recortarCamposDoBloco', () => {
  it('corta atravessando subgrupos e conta o que ficou de fora', () => {
    const recorte = recortarCamposDoBloco([subgrupo('a', 4), subgrupo('b', 4), subgrupo('c', 4)], 6)

    expect(recorte.subgrupos.map((item) => item.campos)).toEqual([
      ['a0', 'a1', 'a2', 'a3'],
      ['b0', 'b1'],
    ])
    expect(recorte.ocultos).toBe(6)
  })

  it('bloco que cabe no limite volta inteiro, sem nada oculto', () => {
    const recorte = recortarCamposDoBloco([subgrupo('a', 3)], 10)

    expect(recorte.subgrupos[0].campos).toHaveLength(3)
    expect(recorte.ocultos).toBe(0)
  })
})
