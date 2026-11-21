import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePaginaPorFiltros } from './usePaginaPorFiltros'

describe('usePaginaPorFiltros', () => {
  it('a página escolhida vale só para a combinação de filtros em que foi escolhida', () => {
    const { result, rerender } = renderHook(({ chave }) => usePaginaPorFiltros(chave), {
      initialProps: { chave: 'publicado=true' },
    })

    act(() => result.current[1](3))
    expect(result.current[0]).toBe(3)

    rerender({ chave: 'publicado=false' })
    expect(result.current[0]).toBe(1)

    // Voltar ao filtro anterior não ressuscita a página antiga.
    rerender({ chave: 'publicado=true' })
    expect(result.current[0]).toBe(1)
  })
})
