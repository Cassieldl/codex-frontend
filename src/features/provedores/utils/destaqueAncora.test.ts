import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  construirIdLinhaCampo,
  EVENTO_ANCORA_DE_CAMPO_LIMPA,
  extrairSlugDoHash,
  limparAncoraDeCampo,
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

describe('limparAncoraDeCampo', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('tira o hash e o hook volta a devolver null, sem hashchange para os outros ouvintes', () => {
    window.history.replaceState(null, '', '/#campo-x')
    const { result } = renderHook(() => useCampoDestacadoPorAncora())
    expect(result.current).toBe('x')
    const aoMudarHash = vi.fn()
    window.addEventListener('hashchange', aoMudarHash)

    act(() => limparAncoraDeCampo())
    window.removeEventListener('hashchange', aoMudarHash)

    expect(window.location.hash).toBe('')
    expect(result.current).toBeNull()
    expect(aoMudarHash).not.toHaveBeenCalled()
  })

  it('permite seguir de novo o mesmo link de campo', () => {
    window.history.replaceState(null, '', '/#campo-x')
    const { result } = renderHook(() => useCampoDestacadoPorAncora())
    act(() => limparAncoraDeCampo())
    expect(result.current).toBeNull()

    act(() => {
      window.history.replaceState(null, '', '/#campo-x')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(result.current).toBe('x')
  })

  it('preserva pathname e search', () => {
    window.history.replaceState(null, '', '/provedores/emissor?pagina=2#campo-x')

    act(() => limparAncoraDeCampo())

    expect(window.location.pathname).toBe('/provedores/emissor')
    expect(window.location.search).toBe('?pagina=2')
    expect(window.location.hash).toBe('')
  })

  it('não faz nada, nem dispara evento, quando o hash não é de campo', () => {
    window.history.replaceState(null, '', '/provedores/emissor?pagina=2#aviso-3')
    const aoLimpar = vi.fn()
    const trocarUrl = vi.fn()
    window.addEventListener(EVENTO_ANCORA_DE_CAMPO_LIMPA, aoLimpar)

    limparAncoraDeCampo(trocarUrl)
    window.removeEventListener(EVENTO_ANCORA_DE_CAMPO_LIMPA, aoLimpar)

    expect(window.location.hash).toBe('#aviso-3')
    expect(trocarUrl).not.toHaveBeenCalled()
    expect(aoLimpar).not.toHaveBeenCalled()
  })

  it('com troca de URL própria (a do router), entrega a URL sem hash a ela e avisa o leitor', () => {
    window.history.replaceState(null, '', '/provedores/emissor?pagina=2#campo-x')
    const { result } = renderHook(() => useCampoDestacadoPorAncora())
    const trocarUrl = vi.fn()

    act(() => limparAncoraDeCampo(trocarUrl))

    expect(trocarUrl).toHaveBeenCalledWith('/provedores/emissor?pagina=2')
    expect(result.current).toBeNull()
  })
})
