import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import { useProvedores } from './useProvedores'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de ProvedorListaItemDto, sem o tipo do cliente.
const provedorFake = {
  slug: 'prefeitura-exemplo',
  nome: 'Prefeitura de Exemplo',
  categoria: 'Nacional',
  identificadorInvoicy: 'EXEMPLO',
  verificadoEm: '2026-07-01',
  versoes: [{ slug: 'v1', rotulo: 'Versão 1' }],
}

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useProvedores', () => {
  it('parseia `PaginatedResponse<T>` CRU - nunca `.data` (AP-ARQUITETURA-001)', async () => {
    server.use(
      http.get(`${API_URL}/provedores`, () =>
        HttpResponse.json({
          items: [provedorFake],
          totalCount: 1,
          page: 1,
          pageSize: 25,
          totalPages: 1,
        }),
      ),
    )

    const { result } = renderHook(() => useProvedores({}), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.items).toEqual([provedorFake])
    expect(result.current.data?.totalCount).toBe(1)
  })
})
