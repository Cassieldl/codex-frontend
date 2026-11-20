import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { versoesAdminKeys } from './versoesAdminKeys'
import { useAtualizarAviso } from './useAtualizarAviso'

const API_URL = import.meta.env.VITE_API_URL

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function capturarPut(avisoId: number) {
  const capturado: { corpo: unknown; ifMatch: string | null } = { corpo: null, ifMatch: null }
  server.use(
    http.put(`${API_URL}/interno/avisos/${avisoId}`, async ({ request }) => {
      capturado.corpo = await request.json()
      capturado.ifMatch = request.headers.get('If-Match')
      return HttpResponse.json({ data: { id: avisoId }, message: null })
    }),
  )
  return capturado
}

describe('useAtualizarAviso', () => {
  it('envia campoVersaoIds no corpo do PUT, com If-Match', async () => {
    const capturado = capturarPut(12)
    const { result } = renderHook(() => useAtualizarAviso(versoesAdminKeys.detail(5)), {
      wrapper: envolverComQueryClient(),
    })

    await act(async () => {
      await result.current.mutateAsync({
        id: 12,
        dto: { severidade: 'Alerta', titulo: 'Título', corpo: 'Corpo', campoVersaoIds: [31, 47] },
        etag: 'W/"9"',
      })
    })

    expect(capturado.corpo).toEqual({
      severidade: 'Alerta',
      titulo: 'Título',
      corpo: 'Corpo',
      campoVersaoIds: [31, 47],
    })
    expect(capturado.ifMatch).toBe('W/"9"')
  })

  it('envia a lista vazia como lista vazia - é o que apaga os vínculos, e não pode sumir', async () => {
    const capturado = capturarPut(7)
    const { result } = renderHook(() => useAtualizarAviso(versoesAdminKeys.detail(5)), {
      wrapper: envolverComQueryClient(),
    })

    await act(async () => {
      await result.current.mutateAsync({
        id: 7,
        dto: { severidade: 'Informativo', titulo: 'Título', corpo: 'Corpo', campoVersaoIds: [] },
        etag: 'W/"3"',
      })
    })

    expect(capturado.corpo).toMatchObject({ campoVersaoIds: [] })
  })
})
