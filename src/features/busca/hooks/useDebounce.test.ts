import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  it('devolve o valor inicial imediatamente, sem esperar o intervalo', () => {
    const { result } = renderHook(() => useDebounce('e0117', 300))

    expect(result.current).toBe('e0117')
  })

  it('só devolve o valor final depois do intervalo, mesmo com trocas rápidas no meio do caminho', async () => {
    const { result, rerender } = renderHook(({ valor }) => useDebounce(valor, 50), {
      initialProps: { valor: 'e' },
    })

    rerender({ valor: 'e0' })
    rerender({ valor: 'e011' })
    rerender({ valor: 'e0117' })

    // Nenhum timer disparou ainda — condição observável logo após as trocas.
    expect(result.current).toBe('e')

    await waitFor(() => expect(result.current).toBe('e0117'))
  })
})
