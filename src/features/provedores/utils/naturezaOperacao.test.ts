import { describe, expect, it } from 'vitest'
import type { GrupoCampoVersao } from '../types/versaoProvedorPagina'
import {
  destinoDaNaturezaOperacao,
  ehCampoNaturezaOperacao,
  separarTagDeDestino,
} from './naturezaOperacao'

function grupoCom(campos: { caminhoXml: string; destinoXml: string | null }[]): GrupoCampoVersao[] {
  return [
    {
      grupo: null,
      grupoSlug: null,
      campos: campos.map((campo, indice) => ({
        campoLayoutSlug: `campo-${indice}`,
        reformaTributaria: false,
        nome: campo.caminhoXml,
        significado: '',
        tipo: 'Numérico',
        tamanho: null,
        mascara: null,
        dominio: null,
        estadoPreenchimento: 'Obrigatorio',
        condicao: null,
        exemplo: null,
        notaPreenchimento: null,
        notaTransformacao: null,
        ordem: indice,
        errosConhecidos: [],
        ...campo,
      })),
    },
  ]
}

describe('naturezaOperacao', () => {
  it('reconhece o natOp pela última tag, e não um campo que só contém o nome', () => {
    expect(ehCampoNaturezaOperacao({ caminhoXml: '//natOp' })).toBe(true)
    expect(ehCampoNaturezaOperacao({ caminhoXml: '//Itens/Item/ItemnatOp' })).toBe(false)
  })

  it('descreve o destino como tag e grupo pai', () => {
    expect(separarTagDeDestino('DPS/infDPS/valores/trib/tribMun/tribISSQN')).toEqual({
      tag: 'tribISSQN',
      grupo: 'tribMun',
    })
    expect(separarTagDeDestino('situacao_tributaria')).toEqual({
      tag: 'situacao_tributaria',
      grupo: null,
    })
  })

  it('acha o destino no campo natOp da versão, ou null quando ele não tem destino', () => {
    const comDestino = grupoCom([
      { caminhoXml: '//tpSusp', destinoXml: 'DPS/tribMun/tpSusp' },
      { caminhoXml: '//natOp', destinoXml: 'DPS/infDPS/valores/trib/tribMun/tribISSQN' },
    ])
    expect(destinoDaNaturezaOperacao(comDestino)).toEqual({ tag: 'tribISSQN', grupo: 'tribMun' })
    expect(
      destinoDaNaturezaOperacao(grupoCom([{ caminhoXml: '//natOp', destinoXml: null }])),
    ).toBeNull()
  })
})
