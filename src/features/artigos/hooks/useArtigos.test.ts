import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import { useArtigos } from './useArtigos'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de ArtigoListaItemDto, sem o tipo do cliente.
const artigos = [
  {
    slug: 'identificar-a-versao-pelo-retorno',
    tipo: 'Procedimento',
    titulo: 'Identificar a versão pelo retorno',
    resumo: 'Como descobrir qual versão o município usa a partir do XML de retorno.',
    verificadoEm: '2026-08-14',
  },
  {
    slug: 'campo-ausente-nao-se-aplica',
    tipo: 'Conceito',
    titulo: 'Campo ausente quer dizer "não se aplica"',
    resumo: null,
    verificadoEm: null,
  },
]

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useArtigos', () => {
  it('lê o PaginatedResponse cru da raiz — nunca o envelope `data` de P8', async () => {
    server.use(
      http.get(`${API_URL}/artigos`, () =>
        HttpResponse.json({
          items: artigos,
          totalCount: 2,
          page: 1,
          pageSize: 25,
          totalPages: 1,
        }),
      ),
    )

    const { result } = renderHook(() => useArtigos({ pagina: 1 }), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.items).toEqual(artigos)
    expect(result.current.data?.totalCount).toBe(2)
  })

  it('envia q, tipo, pagina e tamanhoPagina como query params', async () => {
    let urlChamada: URL | undefined
    server.use(
      http.get(`${API_URL}/artigos`, ({ request }) => {
        urlChamada = new URL(request.url)
        return HttpResponse.json({
          items: [],
          totalCount: 0,
          page: 2,
          pageSize: 50,
          totalPages: 0,
        })
      }),
    )

    const { result } = renderHook(
      () => useArtigos({ q: 'nota fiscal', tipo: 'Mudanca', pagina: 2, tamanhoPagina: 50 }),
      { wrapper: envolverComQueryClient() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(urlChamada?.searchParams.get('q')).toBe('nota fiscal')
    // Valor ASCII exato do contrato (M-5) — "Mudança" com cedilha não existe no wire.
    expect(urlChamada?.searchParams.get('tipo')).toBe('Mudanca')
    expect(urlChamada?.searchParams.get('pagina')).toBe('2')
    expect(urlChamada?.searchParams.get('tamanhoPagina')).toBe('50')
  })

  it('omite parâmetros indefinidos em vez de mandar "undefined" na URL', async () => {
    let urlChamada: URL | undefined
    server.use(
      http.get(`${API_URL}/artigos`, ({ request }) => {
        urlChamada = new URL(request.url)
        return HttpResponse.json({
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 25,
          totalPages: 0,
        })
      }),
    )

    const { result } = renderHook(() => useArtigos({ pagina: 1 }), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(urlChamada?.searchParams.has('tipo')).toBe(false)
    expect(urlChamada?.searchParams.has('q')).toBe(false)
  })

  it('filtro de tipo sem acervo é 200 com lista vazia — nunca erro', async () => {
    server.use(
      http.get(`${API_URL}/artigos`, () =>
        HttpResponse.json({
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 25,
          totalPages: 0,
        }),
      ),
    )

    const { result } = renderHook(() => useArtigos({ tipo: 'Mudanca', pagina: 1 }), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.isError).toBe(false)
    expect(result.current.data?.items).toEqual([])
    expect(result.current.data?.totalCount).toBe(0)
  })
})
