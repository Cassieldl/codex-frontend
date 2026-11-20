import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { TERMO_RECORRENTE, respostaListaTermos } from '../../../../test/mocks/lacunasBusca'
import { server } from '../../../../test/mocks/server'
import { useTermosLacunaBusca } from './useTermosLacunaBusca'

const API_URL = import.meta.env.VITE_API_URL

function criarWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useTermosLacunaBusca', () => {
  it('pede a fila agrupada: estado, ordenação por ocorrência e paginação na query', async () => {
    const capturado: { url: URL | null } = { url: null }
    server.use(
      http.get(`${API_URL}/interno/lacunas-busca/termos`, ({ request }) => {
        capturado.url = new URL(request.url)
        return HttpResponse.json(respostaListaTermos([TERMO_RECORRENTE]))
      }),
    )

    const { result } = renderHook(
      () =>
        useTermosLacunaBusca({
          estado: 'Aberta',
          sortBy: 'ocorrencias',
          sortDirection: 'desc',
          pagina: 2,
          tamanhoPagina: 50,
        }),
      { wrapper: criarWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(capturado.url!.pathname).toMatch(/\/interno\/lacunas-busca\/termos$/)
    expect(Object.fromEntries(capturado.url!.searchParams)).toEqual({
      estado: 'Aberta',
      sortBy: 'ocorrencias',
      sortDirection: 'desc',
      pagina: '2',
      tamanhoPagina: '50',
    })
  })

  it('deriva o etag de cada termo do versaoConcorrencia da ocorrência de referência', async () => {
    server.use(
      http.get(`${API_URL}/interno/lacunas-busca/termos`, () =>
        HttpResponse.json(respostaListaTermos([TERMO_RECORRENTE])),
      ),
    )

    const { result } = renderHook(() => useTermosLacunaBusca({ estado: 'Aberta' }), {
      wrapper: criarWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.items[0].etag).toBe('W/"7"')
    expect(result.current.data?.items[0].lacunaReferenciaId).toBe(41)
    expect(result.current.data?.totalCount).toBe(1)
  })

  /**
   * O GET é cru na raiz. Se o hook passasse a ler `data.items` (o envelope do vizinho), uma
   * resposta enveloped seria aceita e o teste de contrato acima continuaria verde com o mock
   * errado. Aqui o envelope invertido tem de FALHAR, nomeando a coleção que faltou.
   */
  it('recusa a lista enveloped em data - o contrato é cru na raiz', async () => {
    server.use(
      http.get(`${API_URL}/interno/lacunas-busca/termos`, () =>
        HttpResponse.json({ data: respostaListaTermos([TERMO_RECORRENTE]), message: null }),
      ),
    )

    const { result } = renderHook(() => useTermosLacunaBusca({ estado: 'Aberta' }), {
      wrapper: criarWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(String(result.current.error)).toContain('items')
  })
})
