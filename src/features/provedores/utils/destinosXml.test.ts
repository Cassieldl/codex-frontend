import { describe, expect, it } from 'vitest'

import { niveisDoCaminho, nomeDaTag, separarDestinos } from './destinosXml'

describe('separarDestinos', () => {
  it('divide pelo separador literal " | " e mantém um destino por tag', () => {
    expect(separarDestinos('DPS/infDPS/serv/cServ | DPS/infDPS/alt/cTrib')).toHaveLength(2)
  })

  it('não divide por vírgula nem por barra vertical sem espaços', () => {
    expect(separarDestinos('DPS/a/cServ,DPS/b/cTrib')).toHaveLength(1)
    expect(separarDestinos('DPS/a/cServ|DPS/b/cTrib')).toHaveLength(1)
  })

  it('devolve tag e níveis de cada destino', () => {
    expect(separarDestinos('a/b/c | d/e')).toEqual([
      { tipo: 'caminho', caminho: 'a/b/c', niveis: ['a', 'b', 'c'], tag: 'c' },
      { tipo: 'caminho', caminho: 'd/e', niveis: ['d', 'e'], tag: 'e' },
    ])
  })

  it('devolve lista vazia para null e para texto vazio', () => {
    expect(separarDestinos(null)).toEqual([])
    expect(separarDestinos('')).toEqual([])
  })

  it('apara espaços ao redor e descarta item vazio', () => {
    expect(separarDestinos('  a/b  |  | c/d ')).toEqual([
      { tipo: 'caminho', caminho: 'a/b', niveis: ['a', 'b'], tag: 'b' },
      { tipo: 'caminho', caminho: 'c/d', niveis: ['c', 'd'], tag: 'd' },
    ])
  })

  it('trata o item "…" como destinos omitidos, nunca como tag chamada "…"', () => {
    const destinos = separarDestinos('a/b/c | …')

    expect(destinos).toEqual([
      { tipo: 'caminho', caminho: 'a/b/c', niveis: ['a', 'b', 'c'], tag: 'c' },
      { tipo: 'omitidos' },
    ])
    expect(destinos.some((destino) => 'tag' in destino && destino.tag === '…')).toBe(false)
  })

  it('só "…" também é um destino omitido', () => {
    expect(separarDestinos('…')).toEqual([{ tipo: 'omitidos' }])
  })
})

describe('nomeDaTag', () => {
  it('devolve o último nível do caminho', () => {
    expect(nomeDaTag('A/B/C')).toBe('C')
  })

  it('ignora barra no fim do caminho', () => {
    expect(nomeDaTag('A/B/')).toBe('B')
  })
})

describe('niveisDoCaminho', () => {
  it('quebra o caminho em níveis', () => {
    expect(niveisDoCaminho('DPS/infDPS/vServ')).toEqual(['DPS', 'infDPS', 'vServ'])
  })

  it('descarta segmento vazio', () => {
    expect(niveisDoCaminho('//Servico//Valores/')).toEqual(['Servico', 'Valores'])
  })
})
