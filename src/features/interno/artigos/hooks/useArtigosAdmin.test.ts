import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { useArtigosAdmin } from './useArtigosAdmin'

const API_URL = import.meta.env.VITE_API_URL

/**
 * Corpo REAL de `GET /interno/artigos` (I23): `PaginatedResponse<T>` **cru na
 * raiz**, sem envelope `data`. Item de lista é compacto — sem `corpo`,
 * `campoLayoutIds` nem `erroIds` (`decisoes.md` B-1). Nenhum `etag` literal
 * aparece aqui de propósito: o valor tem de ser DERIVADO de
 * `versaoConcorrencia`.
 */
const respostaListagem = {
  items: [
    {
      id: 5,
      slug: 'como-funciona',
      tipo: 'Conceito',
      titulo: 'Como funciona',
      publicado: true,
      reservado: true,
      verificadoEm: '2026-08-30',
      versaoConcorrencia: 12,
    },
    {
      id: 6,
      slug: 'migrar-para-abrasf-204',
      tipo: 'Mudanca',
      titulo: 'Migrar para ABRASF 2.04',
      publicado: false,
      reservado: false,
      verificadoEm: null,
      versaoConcorrencia: 3,
    },
  ],
  totalCount: 2,
  page: 1,
  pageSize: 25,
  totalPages: 1,
}

function criarWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function novoQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('useArtigosAdmin (I23)', () => {
  it('envia os filtros da tela como query params', async () => {
    const capturado: { url: URL | null } = { url: null }
    server.use(
      http.get(`${API_URL}/interno/artigos`, ({ request }) => {
        capturado.url = new URL(request.url)
        return HttpResponse.json(respostaListagem)
      }),
    )

    const { result } = renderHook(
      () =>
        useArtigosAdmin({
          q: 'abrasf',
          tipo: 'Mudanca',
          publicado: false,
          pagina: 2,
          tamanhoPagina: 50,
        }),
      { wrapper: criarWrapper(novoQueryClient()) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(capturado.url?.searchParams.get('q')).toBe('abrasf')
    // Valor de contrato em ASCII (M-5) — byte a byte, nunca "Mudança".
    expect(capturado.url?.searchParams.get('tipo')).toBe('Mudanca')
    expect(capturado.url?.searchParams.get('publicado')).toBe('false')
    expect(capturado.url?.searchParams.get('pagina')).toBe('2')
    expect(capturado.url?.searchParams.get('tamanhoPagina')).toBe('50')
  })

  it('deriva o etag de cada item do versaoConcorrencia do corpo', async () => {
    server.use(http.get(`${API_URL}/interno/artigos`, () => HttpResponse.json(respostaListagem)))

    const { result } = renderHook(() => useArtigosAdmin({ pagina: 1 }), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.items).toHaveLength(2)
    expect(result.current.data?.items[0].etag).toBe('W/"12"')
    expect(result.current.data?.items[1].etag).toBe('W/"3"')
  })

  it('o corpo real não tem campo etag — o valor é derivado, nunca repassado', () => {
    expect(respostaListagem.items).not.toHaveLength(0)
    for (const item of respostaListagem.items) {
      expect(item).not.toHaveProperty('etag')
    }
  })

  it('a lista enxerga rascunho e preserva `reservado` por item', async () => {
    server.use(http.get(`${API_URL}/interno/artigos`, () => HttpResponse.json(respostaListagem)))

    const { result } = renderHook(() => useArtigosAdmin({ pagina: 1 }), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const reservado = result.current.data?.items.find((item) => item.slug === 'como-funciona')
    const rascunho = result.current.data?.items.find((item) => item.id === 6)
    expect(reservado?.reservado).toBe(true)
    expect(rascunho?.reservado).toBe(false)
    expect(rascunho?.publicado).toBe(false)
  })

  it('lê o corpo CRU na raiz — o envelope { data } de I24 não se aplica a I23', async () => {
    server.use(
      http.get(`${API_URL}/interno/artigos`, () =>
        HttpResponse.json({ data: respostaListagem, message: null }),
      ),
    )

    const { result } = renderHook(() => useArtigosAdmin({ pagina: 1 }), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
