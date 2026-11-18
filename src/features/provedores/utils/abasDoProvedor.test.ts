import { describe, expect, it } from 'vitest'
import { abaDoCaminho, abaDoHash } from './abasDoProvedor'

describe('abaDoHash', () => {
  it('leva âncora de campo para Campos e de exemplo para Envio modelo', () => {
    expect(abaDoHash('#campo-dcompetencia')).toBe('campos')
    expect(abaDoHash('#exemplo-tomador-nacional')).toBe('envio')
  })

  it('reconhece as âncoras das antigas seções da página única', () => {
    expect(abaDoHash('#natureza-da-operacao')).toBe('natureza')
    expect(abaDoHash('#envio-modelo')).toBe('envio')
    expect(abaDoHash('#avisos')).toBe('erros')
  })

  it('âncora de aviso ou desconhecida fica onde está', () => {
    expect(abaDoHash('#aviso-12')).toBeNull()
    expect(abaDoHash('')).toBeNull()
    expect(abaDoHash('#qualquer-coisa')).toBeNull()
  })
})

describe('abaDoCaminho', () => {
  const base = '/provedores/emissor-nacional'

  it('acha a aba pelo último segmento, e Erros na raiz do provedor', () => {
    expect(abaDoCaminho(base, base)).toBe('erros')
    expect(abaDoCaminho(`${base}/`, base)).toBe('erros')
    expect(abaDoCaminho(`${base}/campos`, base)).toBe('campos')
    expect(abaDoCaminho(`${base}/envio-modelo`, base)).toBe('envio')
  })

  it('endereço de outra página ou de outro provedor não é aba nenhuma', () => {
    expect(abaDoCaminho('/layout', base)).toBeNull()
    expect(abaDoCaminho('/provedores/emissor-nacional-2', base)).toBeNull()
    expect(abaDoCaminho(`${base}/0-20`, base)).toBeNull()
  })
})
