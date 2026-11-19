import { describe, expect, it } from 'vitest'
import { marcasDoCampoNaEstrutura } from './marcasDoCampoNaEstrutura'

const CAMPOS = new Map([
  ['so-novo', { campo: { novoNestaVersao: true, reformaTributaria: false } }],
  ['so-reforma', { campo: { novoNestaVersao: false, reformaTributaria: true } }],
  ['sem-marca', { campo: { novoNestaVersao: false, reformaTributaria: false } }],
])

describe('marcasDoCampoNaEstrutura', () => {
  it('cada marca vem do próprio campo do dicionário, sem vazar para a outra', () => {
    expect(marcasDoCampoNaEstrutura('so-novo', CAMPOS)).toEqual({
      novoNestaVersao: true,
      reformaTributaria: false,
    })
    expect(marcasDoCampoNaEstrutura('so-reforma', CAMPOS)).toEqual({
      novoNestaVersao: false,
      reformaTributaria: true,
    })
    expect(marcasDoCampoNaEstrutura('sem-marca', CAMPOS)).toEqual({
      novoNestaVersao: false,
      reformaTributaria: false,
    })
  })

  it('tag sem campo, ou com campo fora do dicionário, fica sem marca', () => {
    const semMarca = { novoNestaVersao: false, reformaTributaria: false }

    expect(marcasDoCampoNaEstrutura(null, CAMPOS)).toEqual(semMarca)
    expect(marcasDoCampoNaEstrutura('fora-do-dicionario', CAMPOS)).toEqual(semMarca)
  })
})
