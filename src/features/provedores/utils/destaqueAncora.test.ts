import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  construirIdLinhaCampo,
  extrairSlugDoHash,
  useCampoDestacadoPorAncora,
} from './destaqueAncora'

describe('extrairSlugDoHash', () => {
  it('extrai o slug de um hash `#campo-{slug}`', () => {
    expect(extrairSlugDoHash('#campo-razao-social')).toBe('razao-social')
  })

  it('devolve null para hash vazio ou que não é de campo', () => {
    expect(extrairSlugDoHash('')).toBeNull()
    expect(extrairSlugDoHash('#grupo-identificacao')).toBeNull()
    expect(extrairSlugDoHash('#campo-')).toBeNull()
  })
})

describe('construirIdLinhaCampo', () => {
  it('prefixa o slug com "campo-"', () => {
    expect(construirIdLinhaCampo('razao-social')).toBe('campo-razao-social')
  })
})

describe('useCampoDestacadoPorAncora', () => {
  afterEach(() => {
    window.location.hash = ''
  })

  it('destaca só a linha correspondente quando o hash bate', () => {
    window.location.hash = '#campo-razao-social'

    const { result } = renderHook(() => useCampoDestacadoPorAncora())

    expect(result.current).toBe('razao-social')
  })

  it('devolve null quando não há hash de campo', () => {
    const { result } = renderHook(() => useCampoDestacadoPorAncora())

    expect(result.current).toBeNull()
  })

  it('muda a linha destacada quando o hash muda', () => {
    window.location.hash = '#campo-razao-social'
    const { result } = renderHook(() => useCampoDestacadoPorAncora())
    expect(result.current).toBe('razao-social')

    act(() => {
      window.location.hash = '#campo-inscricao-municipal'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(result.current).toBe('inscricao-municipal')
  })
})
