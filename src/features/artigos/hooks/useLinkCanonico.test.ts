import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLinkCanonico } from './useLinkCanonico'

function linksCanonicos() {
  return Array.from(document.head.querySelectorAll('link[rel="canonical"]'))
}

describe('useLinkCanonico', () => {
  it('insere o <link rel="canonical"> com o href do artigo e remove ao desmontar', () => {
    const { unmount } = renderHook(() => useLinkCanonico('/como-funciona'))

    expect(linksCanonicos().map((link) => link.getAttribute('href'))).toEqual(['/como-funciona'])

    unmount()
    expect(linksCanonicos()).toHaveLength(0)
  })

  it('troca o href sem deixar canonical duplicado na página', () => {
    const { rerender, unmount } = renderHook(({ href }) => useLinkCanonico(href), {
      initialProps: { href: '/artigos/primeiro' },
    })

    rerender({ href: '/artigos/segundo' })

    expect(linksCanonicos().map((link) => link.getAttribute('href'))).toEqual(['/artigos/segundo'])
    unmount()
  })

  it('não insere nada enquanto o artigo ainda não carregou', () => {
    const { unmount } = renderHook(() => useLinkCanonico(undefined))

    expect(linksCanonicos()).toHaveLength(0)
    unmount()
  })
})
