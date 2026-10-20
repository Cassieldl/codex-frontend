import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { isAxiosError } from 'axios'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { handlerHomeCruSemEnvelope, handlerHomeErro } from '../../../test/mocks/handlers'
import { server } from '../../../test/mocks/server'
import { homeKeys } from './homeKeys'
import { useHome } from './useHome'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de HomeDto, sem o tipo do cliente.
const home = {
  comunicados: [],
  provedoresPorCategoria: [
    {
      categoria: 'Nacional',
      total: 1,
      provedores: [
        {
          slug: 'nacional-adn',
          nome: 'Nacional/ADN',
          ultimaVersao: { slug: '1-01', rotulo: '1.01' },
          versoes: [{ slug: '1-01', rotulo: '1.01' }],
          verificadoEm: '2026-08-12',
          temComunicado: false,
        },
      ],
    },
  ],
  layout: null,
  artigosRecentes: [],
}

function envolverComQueryClient(
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useHome', () => {
  it('lê o envelope `data` de P9 — ApiResponse, não PaginatedResponse cru', async () => {
    server.use(http.get(`${API_URL}/home`, () => HttpResponse.json({ data: home, message: null })))

    const { result } = renderHook(() => useHome(), { wrapper: envolverComQueryClient() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(home)
  })

  it('falha alto quando a resposta vem no envelope do vizinho (cru na raiz)', async () => {
    // As listagens públicas respondem cruas na raiz. Se este hook aceitasse os
    // dois formatos, o teste acima passaria por coincidência — aqui a leitura
    // TEM de quebrar, nunca entregar uma Home meio vazia como se fosse sucesso.
    server.use(handlerHomeCruSemEnvelope(home))

    const { result } = renderHook(() => useHome(), { wrapper: envolverComQueryClient() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })

  it('propaga o AxiosError quando P9 falha', async () => {
    server.use(handlerHomeErro(500))

    const { result } = renderHook(() => useHome(), { wrapper: envolverComQueryClient() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(isAxiosError(result.current.error)).toBe(true)
    expect(isAxiosError(result.current.error) && result.current.error.response?.status).toBe(500)
  })

  it('guarda o agregado sob homeKeys.all e não refaz a busca ao remontar', async () => {
    let chamadas = 0
    server.use(
      http.get(`${API_URL}/home`, () => {
        chamadas += 1
        return HttpResponse.json({ data: home, message: null })
      }),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = envolverComQueryClient(queryClient)

    const primeira = renderHook(() => useHome(), { wrapper })
    await waitFor(() => expect(primeira.result.current.isSuccess).toBe(true))
    primeira.unmount()

    // O `staleTime` espelha o `Cache-Control: max-age=60` do servidor (PQ-12):
    // voltar para a Home dentro do minuto serve do cache, sem nova requisição.
    const segunda = renderHook(() => useHome(), { wrapper })
    await waitFor(() => expect(segunda.result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(homeKeys.all)).toEqual(home)
    expect(chamadas).toBe(1)
  })
})
