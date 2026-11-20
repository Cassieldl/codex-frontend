import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import { buscaKeys } from './buscaKeys'
import { useResultadoBusca } from './useResultadoBusca'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de ResultadoBuscaDto, sem o tipo do cliente.
const resultadoFake = {
  termo: 'e0117',
  termoUsado: 'e0117',
  correcao: null,
  qualidade: 'exata',
  totalGeral: 1,
  grupos: [],
  foraDoFiltro: null,
  filtroProvedor: null,
}

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useResultadoBusca', () => {
  it('gera a queryKey a partir de buscaKeys.resultado', () => {
    expect(buscaKeys.resultado({ q: 'e0117' })).toEqual(['busca', 'resultado', { q: 'e0117' }])
  })

  it('parseia o campo `.data` do envelope ApiResponse - nunca `.items`', async () => {
    const requisicaoCapturada: { url: URL | null } = { url: null }
    server.use(
      http.get(`${API_URL}/busca`, ({ request }) => {
        requisicaoCapturada.url = new URL(request.url)
        return HttpResponse.json({ data: resultadoFake, message: null })
      }),
    )

    const { result } = renderHook(() => useResultadoBusca({ q: 'e0117' }), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(resultadoFake)
    expect(requisicaoCapturada.url?.searchParams.get('q')).toBe('e0117')
  })

  it('usa apiPublico - nunca injeta Authorization', async () => {
    const requisicaoCapturada: { authorization: string | null } = { authorization: 'valor-inicial' }
    server.use(
      http.get(`${API_URL}/busca`, ({ request }) => {
        requisicaoCapturada.authorization = request.headers.get('Authorization')
        return HttpResponse.json({ data: resultadoFake, message: null })
      }),
    )

    const { result } = renderHook(() => useResultadoBusca({ q: 'e0117' }), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requisicaoCapturada.authorization).toBeNull()
  })

  it('não dispara a busca com termo menor que 2 caracteres', () => {
    server.use(
      http.get(`${API_URL}/busca`, () => {
        throw new Error('não deveria bater na rede com termo curto')
      }),
    )

    const { result } = renderHook(() => useResultadoBusca({ q: 'e' }), {
      wrapper: envolverComQueryClient(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
  })
})
