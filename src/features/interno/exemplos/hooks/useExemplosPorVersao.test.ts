import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { useExemplosPorVersao } from './useExemplosPorVersao'

const API_URL = import.meta.env.VITE_API_URL

const exemplosDaVersao = [
  {
    id: 1,
    versaoProvedorId: 10,
    slug: 'nota-simples',
    nome: 'Nota simples',
    descricao: 'Serviço único, sem retenção.',
    xml: '<nfse>\n  <servico />\n</nfse>',
    versaoConcorrencia: 7,
  },
  {
    id: 2,
    versaoProvedorId: 10,
    slug: 'nota-com-retencao',
    nome: 'Nota com retenção',
    descricao: null,
    xml: '<nfse />',
    versaoConcorrencia: 9,
  },
]

function criarWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function novoQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('useExemplosPorVersao (I38)', () => {
  it('lê a coleção do envelope { data } e deriva o etag de cada item', async () => {
    server.use(
      http.get(`${API_URL}/interno/versoes/10/exemplos`, () =>
        HttpResponse.json({ data: exemplosDaVersao, message: null }),
      ),
    )

    const { result } = renderHook(() => useExemplosPorVersao(10), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.map((exemplo) => exemplo.etag)).toEqual(['W/"7"', 'W/"9"'])
    expect(result.current.data?.[0].slug).toBe('nota-simples')
  })

  it('falha quando a resposta vem CRUA, sem o envelope { data } que I38 usa', async () => {
    // Envelope do vizinho: listagens paginadas do projeto são cruas na raiz, esta
    // coleção NÃO é. Ler a forma errada tem de quebrar, não devolver lista vazia.
    server.use(
      http.get(`${API_URL}/interno/versoes/10/exemplos`, () => HttpResponse.json(exemplosDaVersao)),
    )

    const { result } = renderHook(() => useExemplosPorVersao(10), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('versão ainda não resolvida (id 0) não dispara requisição', () => {
    // Sem handler registrado: qualquer chamada derruba o teste
    // (`onUnhandledRequest: 'error'`).
    const { result } = renderHook(() => useExemplosPorVersao(0), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
  })
})
