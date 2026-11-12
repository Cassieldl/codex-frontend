import { describe, expect, it } from 'vitest'
import { descreverLayoutDoProvedor } from './layoutDoProvedor'

describe('descreverLayoutDoProvedor', () => {
  it('alerta e diz a vigente quando a versão do provedor foi escrita contra outra', () => {
    expect(descreverLayoutDoProvedor('8', '9')).toEqual({
      texto: 'Layout InvoiCy 8, vigente é a 9',
      desatualizado: true,
    })
  })

  // O cadastro pode trazer "Versão 9" de um lado e "9" do outro: é a mesma versão.
  it('não alerta quando é a vigente, com ou sem a palavra "versão" no rótulo', () => {
    expect(descreverLayoutDoProvedor('Versão 9', '9')).toEqual({
      texto: 'Layout InvoiCy 9',
      desatualizado: false,
    })
  })

  it('não alerta sem vigente conhecida', () => {
    expect(descreverLayoutDoProvedor('8', null)).toEqual({
      texto: 'Layout InvoiCy 8',
      desatualizado: false,
    })
  })
})
