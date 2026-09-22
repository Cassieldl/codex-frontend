import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import { provedoresAdminKeys } from '../provedores/hooks/provedoresAdminKeys'
import type { ProvedorAdminDetalhe } from '../provedores/types/provedorAdmin'
import { usePublicarProvedor } from './usePublicarProvedor'

const API_URL = import.meta.env.VITE_API_URL

const provedorFake: ProvedorAdminDetalhe = {
  id: 42,
  slug: 'prefeitura-de-exemplo',
  nome: 'Prefeitura de Exemplo',
  categoria: 'Nacional',
  identificadorInvoicy: 'PREF-EXEMPLO',
  aliases: [],
  publicado: true,
  avisos: [],
  versaoConcorrencia: 7,
}

function criarWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('usePublicarProvedor', () => {
  it('chama PUT /interno/provedores/{id}/publicacao com { publicado } e If-Match', async () => {
    const requisicaoCapturada: { body: unknown; ifMatch: string | null } = {
      body: null,
      ifMatch: null,
    }
    server.use(
      http.put(`${API_URL}/interno/provedores/42/publicacao`, async ({ request }) => {
        requisicaoCapturada.body = await request.json()
        requisicaoCapturada.ifMatch = request.headers.get('If-Match')
        return HttpResponse.json({ data: provedorFake, message: null })
      }),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => usePublicarProvedor(), {
      wrapper: criarWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({ id: 42, publicado: true, etag: 'W/"7"' })
    })

    expect(requisicaoCapturada.body).toEqual({ publicado: true })
    expect(requisicaoCapturada.ifMatch).toBe('W/"7"')
  })

  it('invalida a query de detalhe do provedor no sucesso', async () => {
    server.use(
      http.put(`${API_URL}/interno/provedores/42/publicacao`, () =>
        HttpResponse.json({ data: provedorFake, message: null }),
      ),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(provedoresAdminKeys.detail(42), provedorFake)

    const { result } = renderHook(() => usePublicarProvedor(), {
      wrapper: criarWrapper(queryClient),
    })

    expect(queryClient.getQueryState(provedoresAdminKeys.detail(42))?.isInvalidated).toBe(false)

    await act(async () => {
      await result.current.mutateAsync({ id: 42, publicado: false, etag: 'W/"7"' })
    })

    await waitFor(() =>
      expect(queryClient.getQueryState(provedoresAdminKeys.detail(42))?.isInvalidated).toBe(true),
    )
  })
})
