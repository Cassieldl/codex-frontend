import { describe, expect, it } from 'vitest'
import type { GrupoCampoVersao } from '../types/versaoProvedorPagina'
import { camposComMaisRejeicoes } from './camposComMaisRejeicoes'

function campo(nome: string, rejeicoes: number) {
  return {
    campoLayoutSlug: nome.toLowerCase(),
    nome,
    errosConhecidos: Array.from({ length: rejeicoes }, (_, indice) => ({
      slug: `${nome}-${indice}`,
    })),
  }
}

const grupos = [
  { campos: [campo('natOp', 5), campo('RPSSerie', 2), campo('tpAmb', 0)] },
  { campos: [campo('dCompetencia', 6), campo('RegEspTrib', 6)] },
] as unknown as GrupoCampoVersao[]

describe('camposComMaisRejeicoes', () => {
  it('ordena do mais rejeitado ao menos, com empate em ordem alfabética', () => {
    expect(camposComMaisRejeicoes(grupos).map((item) => item.nome)).toEqual([
      'dCompetencia',
      'RegEspTrib',
      'natOp',
      'RPSSerie',
    ])
  })

  it('deixa de fora campo sem rejeição e respeita o limite', () => {
    expect(camposComMaisRejeicoes(grupos, 2).map((item) => item.rejeicoes)).toEqual([6, 6])
  })
})
