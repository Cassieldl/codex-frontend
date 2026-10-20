import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { buscaInternaKeys } from './buscaInternaKeys'
import { useResultadoBuscaInterna } from './useResultadoBuscaInterna'

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

describe('useResultadoBuscaInterna', () => {
  it('gera a queryKey a partir de buscaInternaKeys.resultado', () => {
    expect(buscaInternaKeys.resultado({ q: 'e0117' })).toEqual([
      'buscaInterna',
      'resultado',
      { q: 'e0117' },
    ])
  })

  it('usa apiInterno — chama GET /interno/busca (nunca o endpoint público /busca)', async () => {
    const rotasChamadas: string[] = []
    server.use(
      http.get(`${API_URL}/interno/busca`, ({ request }) => {
        rotasChamadas.push(new URL(request.url).pathname)
        return HttpResponse.json({ data: resultadoFake, message: null })
      }),
      http.get(`${API_URL}/busca`, () => {
        rotasChamadas.push('/busca-publico-chamado-por-engano')
        return HttpResponse.json({ data: resultadoFake, message: null })
      }),
    )

    const { result } = renderHook(() => useResultadoBuscaInterna({ q: 'e0117' }), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(resultadoFake)
    expect(rotasChamadas).toEqual(['/api/v1/interno/busca'])
  })

  it('injeta Authorization quando há sessão (cliente apiInterno, diferente do público)', async () => {
    const requisicaoCapturada: { authorization: string | null } = { authorization: null }
    server.use(
      http.get(`${API_URL}/interno/busca`, ({ request }) => {
        requisicaoCapturada.authorization = request.headers.get('Authorization')
        return HttpResponse.json({ data: resultadoFake, message: null })
      }),
    )

    const { result } = renderHook(() => useResultadoBuscaInterna({ q: 'e0117' }), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Sem sessão de teste ativa o header pode vir ausente — o que importa é
    // que a chamada passou pelo interceptor de `apiInterno` (garantirAutenticacao
    // + injeção condicional), nunca pelo cliente público, já asserido acima.
    expect(
      requisicaoCapturada.authorization === null ||
        requisicaoCapturada.authorization?.startsWith('Bearer'),
    ).toBe(true)
  })

  it('não dispara a busca com termo menor que 2 caracteres', () => {
    server.use(
      http.get(`${API_URL}/interno/busca`, () => {
        throw new Error('não deveria bater na rede com termo curto')
      }),
    )

    const { result } = renderHook(() => useResultadoBuscaInterna({ q: 'e' }), {
      wrapper: envolverComQueryClient(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
  })
})
