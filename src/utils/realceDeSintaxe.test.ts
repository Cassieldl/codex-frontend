import { describe, expect, it } from 'vitest'
import { realcarTrecho } from './realceDeSintaxe'

function tipos(texto: string, formato: 'xml' | 'json', aposNome = false) {
  return realcarTrecho(texto, formato, aposNome).map(({ tipo, texto: parte }) => [tipo, parte])
}

describe('realcarTrecho', () => {
  it('no XML, o conteúdo entre as tags é valor e o nome dentro de < > é tag', () => {
    expect(tipos('>2026-12-31T23:59:59</dEmis>', 'xml')).toEqual([
      ['pontuacao', '>'],
      ['valor', '2026-12-31T23:59:59'],
      ['pontuacao', '</'],
      ['tag', 'dEmis'],
      ['pontuacao', '>'],
    ])
  })

  it('no XML, fechamento de grupo e tag vazia não têm valor', () => {
    expect(tipos('</RPS>', 'xml')).toEqual([
      ['pontuacao', '</'],
      ['tag', 'RPS'],
      ['pontuacao', '>'],
    ])
    expect(tipos('/>', 'xml')).toEqual([['pontuacao', '/>']])
  })

  it('no JSON, depois do nome a aspa fecha a chave e o que vem após os dois-pontos é valor', () => {
    expect(tipos('": "XXXXX",', 'json', true)).toEqual([
      ['pontuacao', '": '],
      ['valor', '"XXXXX"'],
      ['pontuacao', ','],
    ])
    expect(tipos('": [0.00]', 'json', true)).toEqual([
      ['pontuacao', '": ['],
      ['valor', '0.00'],
      ['pontuacao', ']'],
    ])
    expect(tipos('": null', 'json', true)).toEqual([
      ['pontuacao', '": '],
      ['valor', 'null'],
    ])
  })

  it('no JSON, string seguida de dois-pontos é chave e a moldura é só pontuação', () => {
    expect(tipos('"natOp": 1', 'json')).toEqual([
      ['tag', '"natOp"'],
      ['pontuacao', ': '],
      ['valor', '1'],
    ])
    expect(tipos('},', 'json')).toEqual([['pontuacao', '},']])
    expect(tipos('"', 'json')).toEqual([['pontuacao', '"']])
  })
})
