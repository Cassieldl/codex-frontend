import { describe, expect, it } from 'vitest'
import type { MudancaDaVersaoLayout } from '../types/layoutPublico'
import {
  agruparMudancas,
  campoDaMudanca,
  contarMudancasDaVersao,
  resolverCampoCitado,
  rotulosDosChips,
} from './mudancasDaVersao'

const CAMPOS = [
  { slug: 'numero-duimp', caminhoXml: '//Servico/Valores/nroDUIMP' },
  { slug: 'cep-prestador', caminhoXml: '//Prestador/Endereco/CEP' },
  { slug: 'cep-tomador', caminhoXml: '//Tomador/Endereco/CEP' },
  { slug: 'valor-estimado', caminhoXml: '//Servico/Valores/ValServEst' },
]

function mudanca(
  tipo: MudancaDaVersaoLayout['tipo'],
  antes: string | null,
  depois: string | null,
): MudancaDaVersaoLayout {
  return { tipo, antes, depois, descricao: null }
}

describe('agruparMudancas', () => {
  it('segue a ordem fixa da tela e deixa de fora os grupos vazios', () => {
    const grupos = agruparMudancas([
      mudanca('saiu', 'ValServEst', null),
      mudanca('renomeado', 'nDI', 'nroDUIMP'),
      mudanca('grupoNovo', null, 'Condominio'),
    ])

    expect(grupos.map((grupo) => grupo.rotulo)).toEqual(['Grupos novos', 'Renomeados', 'Saíram'])
  })
})

describe('resolverCampoCitado', () => {
  it('acha o campo pelo caminho inteiro ou pela tag na ponta', () => {
    expect(resolverCampoCitado('Servico/Valores/nroDUIMP', CAMPOS)).toBe('numero-duimp')
    expect(resolverCampoCitado('nroDUIMP', CAMPOS)).toBe('numero-duimp')
  })

  it('não escolhe entre dois candidatos nem segue caminho resumido', () => {
    expect(resolverCampoCitado('CEP', CAMPOS)).toBeNull()
    expect(resolverCampoCitado('Valores/...', CAMPOS)).toBeNull()
    expect(resolverCampoCitado('texto de 8 posições', CAMPOS)).toBeNull()
  })
})

describe('campoDaMudanca', () => {
  it('o que saiu aponta para o de antes; o resto, para o de depois', () => {
    expect(campoDaMudanca(mudanca('saiu', 'ValServEst', null), CAMPOS)).toBe('valor-estimado')
    expect(campoDaMudanca(mudanca('renomeado', 'nDI', 'nroDUIMP'), CAMPOS)).toBe('numero-duimp')
  })
})

describe('contarMudancasDaVersao', () => {
  it('conta os itens da lista e põe os campos marcados no dicionário como detalhe', () => {
    const contadores = contarMudancasDaVersao(
      [
        mudanca('grupoNovo', null, 'Condominio'),
        mudanca('grupoNovo', null, 'Obra'),
        mudanca('campoNovo', null, 'nroDUIMP'),
        mudanca('saiu', 'ValServEst', null),
        mudanca('mudouDeLugar', 'tpOper', 'RPSSubs/tpOper'),
      ],
      { novos: 44, descontinuados: 1 },
    )

    expect(contadores).toEqual([
      { chave: 'novos', quantidade: 3, camposAfetados: 44 },
      { chave: 'descontinuados', quantidade: 1, camposAfetados: null },
      { chave: 'mudaramDeLugar', quantidade: 1, camposAfetados: null },
    ])
  })

  it('sem mudanças estruturadas, conta os campos que viram chip, sem detalhe', () => {
    expect(contarMudancasDaVersao([], { novos: 4, descontinuados: 0 })).toEqual([
      { chave: 'novos', quantidade: 4, camposAfetados: null },
    ])
  })
})

describe('rotulosDosChips', () => {
  it('nome repetido vira a ponta do caminho que separa os dois; nome único fica', () => {
    const rotulos = rotulosDosChips([
      { slug: 'docc-mun-a', nome: 'DoccMun', caminhoXml: '//Obra/Endereco/DoccMun' },
      { slug: 'docc-mun-b', nome: 'DoccMun', caminhoXml: '//Evento/Endereco/DoccMun' },
      { slug: 'cep', nome: 'CEP', caminhoXml: '//Obra/Endereco/CEP' },
    ])

    expect([...rotulos.values()]).toEqual([
      'Obra/Endereco/DoccMun',
      'Evento/Endereco/DoccMun',
      'CEP',
    ])
  })
})
