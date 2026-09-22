import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  construirIdExemplo,
  construirLinkExemplo,
  extrairSlugDoExemploNoHash,
  useExemploDestacadoPorAncora,
} from './exemploAncora'

describe('construirIdExemplo', () => {
  it('prefixa o slug com "exemplo-"', () => {
    expect(construirIdExemplo('iss-retido')).toBe('exemplo-iss-retido')
  })
})

describe('extrairSlugDoExemploNoHash', () => {
  it('extrai o slug de um hash `#exemplo-{slug}`', () => {
    expect(extrairSlugDoExemploNoHash('#exemplo-iss-retido')).toBe('iss-retido')
  })

  it('devolve null para hash vazio, de outro prefixo ou sem slug', () => {
    expect(extrairSlugDoExemploNoHash('')).toBeNull()
    // `#campo-…` é a âncora da tabela de campos — nunca abre um exemplo.
    expect(extrairSlugDoExemploNoHash('#campo-razao-social')).toBeNull()
    expect(extrairSlugDoExemploNoHash('#exemplo-')).toBeNull()
  })
})

describe('construirLinkExemplo', () => {
  it('monta o endereço da versão com a âncora do exemplo', () => {
    expect(
      construirLinkExemplo('https://codex.migrate.info', 'ipm', '2-04', 'sem-tomador'),
    ).toBe('https://codex.migrate.info/provedores/ipm/2-04#exemplo-sem-tomador')
  })
})

describe('useExemploDestacadoPorAncora', () => {
  afterEach(() => {
    window.location.hash = ''
  })

  it('devolve o slug do exemplo pedido pela âncora', () => {
    window.location.hash = '#exemplo-iss-retido'

    const { result } = renderHook(() => useExemploDestacadoPorAncora())

    expect(result.current).toBe('iss-retido')
  })

  it('devolve null quando o hash é de campo, não de exemplo', () => {
    window.location.hash = '#campo-razao-social'

    const { result } = renderHook(() => useExemploDestacadoPorAncora())

    expect(result.current).toBeNull()
  })

  it('acompanha a troca de hash depois da montagem', () => {
    window.location.hash = '#exemplo-iss-retido'
    const { result } = renderHook(() => useExemploDestacadoPorAncora())
    expect(result.current).toBe('iss-retido')

    act(() => {
      window.location.hash = '#exemplo-tomador-estrangeiro'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(result.current).toBe('tomador-estrangeiro')
  })
})
