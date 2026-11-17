import { describe, expect, it } from 'vitest'
import { cenariosParaEscolha } from './cenariosDoEnvioModelo'

describe('cenariosParaEscolha', () => {
  it('mantém a ordem da tela, com o nacional primeiro', () => {
    expect(
      cenariosParaEscolha([
        'retencoes-federais',
        'tomador-estrangeiro',
        'nacional',
        'construcao-civil',
      ]),
    ).toEqual(['nacional', 'tomador-estrangeiro', 'construcao-civil', 'retencoes-federais'])
  })

  it('descarta cenário desconhecido e garante o nacional', () => {
    expect(cenariosParaEscolha(['exportacao'])).toEqual(['nacional'])
    expect(cenariosParaEscolha([])).toEqual(['nacional'])
  })
})
