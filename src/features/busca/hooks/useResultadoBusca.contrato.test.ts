import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import type { TokenCorrecao } from '../types/resultadoBusca'
import { useResultadoBusca } from './useResultadoBusca'

const API_URL = import.meta.env.VITE_API_URL

// JSON transcrito de `ResultadoBuscaDto`/`BuscaCorrecaoDto`/`BuscaTokenCorrecaoDto`, sem o tipo
// do cliente: a correção chega com `de`, `para` e `similaridade` por token.
const respostaDaApiComCorrecao = {
  data: {
    termo: 'aliqouta',
    termoUsado: 'aliquota',
    correcao: {
      termoOriginal: 'aliqouta',
      termoCorrigido: 'aliquota',
      tokens: [{ de: 'aliqouta', para: 'aliquota', similaridade: 0.64 }],
    },
    qualidade: 'aproximada',
    totalGeral: 0,
    grupos: [],
    foraDoFiltro: null,
    filtroProvedor: null,
  },
  message: null,
}

type TokenNoFio = (typeof respostaDaApiComCorrecao)['data']['correcao']['tokens'][number]

type MesmoFormato<A, B> =
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- o T só existe para comparar A e B com igualdade exata
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

// Falha no `tsc -b` se o tipo do cliente divergir do token que a API envia.
const tokenDoClienteIgualAoDoFio: MesmoFormato<TokenNoFio, TokenCorrecao> = true

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useResultadoBusca contra o JSON da API', () => {
  it('o tipo do token de correção tem a forma do DTO', () => {
    expect(tokenDoClienteIgualAoDoFio).toBe(true)
  })

  it('lê o token corrigido pelos nomes que a API envia', async () => {
    server.use(http.get(`${API_URL}/busca`, () => HttpResponse.json(respostaDaApiComCorrecao)))

    const { result } = renderHook(() => useResultadoBusca({ q: 'aliqouta' }), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [token] = result.current.data?.correcao?.tokens ?? []
    expect(token?.de).toBe('aliqouta')
    expect(token?.para).toBe('aliquota')
    expect(token?.similaridade).toBe(0.64)
  })
})
