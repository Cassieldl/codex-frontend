import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import { errosKeys } from './errosKeys'
import { useErrosPorCodigo } from './useErrosPorCodigo'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de ErroListaItemDto, sem o tipo do cliente.
const itemFake = {
  slug: 'e0117-cnpj-tomador-invalido',
  codigo: 'E0117',
  titulo: 'CNPJ do tomador inválido',
  origem: 'Prefeitura',
  provedorNome: 'IPM Sistemas',
}

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useErrosPorCodigo', () => {
  it('gera a queryKey a partir de errosKeys.list', () => {
    expect(errosKeys.list({ codigo: 'E0117' })).toEqual(['erros', 'list', { codigo: 'E0117' }])
  })

  it('parseia o envelope PaginatedResponse **cru** — nunca `.data`', async () => {
    const requisicaoCapturada: { url: URL | null } = { url: null }
    server.use(
      http.get(`${API_URL}/erros`, ({ request }) => {
        requisicaoCapturada.url = new URL(request.url)
        return HttpResponse.json({
          items: [itemFake],
          totalCount: 1,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        })
      }),
    )

    const { result } = renderHook(() => useErrosPorCodigo('E0117'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      items: [itemFake],
      totalCount: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    })
    expect(requisicaoCapturada.url?.searchParams.get('codigo')).toBe('E0117')
  })

  it('não dispara a query com código vazio', () => {
    server.use(
      http.get(`${API_URL}/erros`, () => {
        throw new Error('não deveria bater na rede sem código')
      }),
    )

    const { result } = renderHook(() => useErrosPorCodigo(''), {
      wrapper: envolverComQueryClient(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
  })
})
