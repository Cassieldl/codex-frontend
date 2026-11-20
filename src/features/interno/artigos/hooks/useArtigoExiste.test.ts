import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { SLUG_COMO_FUNCIONA } from '../../../artigos/utils/slugsReservados'
import { server } from '../../../../test/mocks/server'
import { useArtigoExiste } from './useArtigoExiste'

const API_URL = import.meta.env.VITE_API_URL

function criarWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function novoQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('useArtigoExiste (I36)', () => {
  it('pergunta pelo slug no endpoint dedicado - nunca varre a listagem paginada', async () => {
    const capturado: { url: URL | null } = { url: null }
    server.use(
      http.get(`${API_URL}/interno/artigos/existe`, ({ request }) => {
        capturado.url = new URL(request.url)
        return HttpResponse.json({
          data: { slug: SLUG_COMO_FUNCIONA, existe: true, artigoId: 5 },
          message: null,
        })
      }),
    )

    const { result } = renderHook(() => useArtigoExiste(SLUG_COMO_FUNCIONA), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(capturado.url?.pathname.endsWith('/interno/artigos/existe')).toBe(true)
    expect(capturado.url?.searchParams.get('slug')).toBe(SLUG_COMO_FUNCIONA)
    expect(result.current.data?.existe).toBe(true)
    expect(result.current.data?.artigoId).toBe(5)
  })

  it('ausência vem como existe:false com artigoId nulo - nunca 404', async () => {
    server.use(
      http.get(`${API_URL}/interno/artigos/existe`, () =>
        HttpResponse.json({
          data: { slug: SLUG_COMO_FUNCIONA, existe: false, artigoId: null },
          message: null,
        }),
      ),
    )

    const { result } = renderHook(() => useArtigoExiste(SLUG_COMO_FUNCIONA), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.existe).toBe(false)
    expect(result.current.data?.artigoId).toBeNull()
  })

  it('lê do envelope { data } - I36 não responde corpo cru', async () => {
    server.use(
      http.get(`${API_URL}/interno/artigos/existe`, () =>
        HttpResponse.json({ slug: SLUG_COMO_FUNCIONA, existe: true, artigoId: 5 }),
      ),
    )

    const { result } = renderHook(() => useArtigoExiste(SLUG_COMO_FUNCIONA), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    // Corpo cru não tem `data`: a leitura enveloped falha em vez de produzir
    // um "existe" acidental - a tela nunca deduz existência de shape errado.
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })

  it('não consulta com slug vazio', () => {
    const { result } = renderHook(() => useArtigoExiste(''), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
  })
})
