import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import type { LayoutIndice } from '../types/layoutPublico'
import { useLayoutIndice } from './useLayoutIndice'

const API_URL = import.meta.env.VITE_API_URL

const indiceFake: LayoutIndice = {
  vigente: { slug: '4-12', rotulo: '4.12', estado: 'Vigente', ordem: 2, totalCampos: 58 },
  versoes: [
    { slug: '4-13', rotulo: '4.13', estado: 'Prevista', ordem: 3, totalCampos: 62 },
    { slug: '4-12', rotulo: '4.12', estado: 'Vigente', ordem: 2, totalCampos: 58 },
    { slug: '4-10', rotulo: '4.10', estado: 'Anterior', ordem: 1, totalCampos: 55 },
  ],
}

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useLayoutIndice', () => {
  it('lê o campo `.data` do envelope ApiResponse (P10)', async () => {
    server.use(
      http.get(`${API_URL}/layout`, () => HttpResponse.json({ data: indiceFake, message: null })),
    )

    const { result } = renderHook(() => useLayoutIndice(), { wrapper: envolverComQueryClient() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(indiceFake)
  })

  it('preserva a ordem das versões devolvida pelo backend, sem reordenar', async () => {
    server.use(
      http.get(`${API_URL}/layout`, () => HttpResponse.json({ data: indiceFake, message: null })),
    )

    const { result } = renderHook(() => useLayoutIndice(), { wrapper: envolverComQueryClient() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Ordem de chegada: prevista, vigente, anterior — nem alfabética, nem o
    // inverso dela: uma reordenação acidental no cliente cai aqui.
    expect(result.current.data?.versoes.map((versao) => versao.slug)).toEqual([
      '4-13',
      '4-12',
      '4-10',
    ])
  })

  it('a leitura FALHA quando a resposta vem no envelope do vizinho (cru na raiz)', async () => {
    // Listagens deste projeto são cruas na raiz e todo o resto vem em `data`.
    // P10 é enveloped: responder cru tem de quebrar, nunca ser aceito em
    // silêncio (AP-ARQUITETURA-001).
    server.use(http.get(`${API_URL}/layout`, () => HttpResponse.json(indiceFake)))

    const { result } = renderHook(() => useLayoutIndice(), { wrapper: envolverComQueryClient() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })

  it('propaga falha de rede como isError, nunca como dado vazio', async () => {
    server.use(http.get(`${API_URL}/layout`, () => HttpResponse.json({}, { status: 500 })))

    const { result } = renderHook(() => useLayoutIndice(), { wrapper: envolverComQueryClient() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })
})
