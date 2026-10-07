import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { LACUNA_RECORRENTE } from '../../../../test/mocks/lacunasBusca'
import { server } from '../../../../test/mocks/server'
import { lacunasBuscaKeys } from './lacunasBuscaKeys'
import { useAlterarEstadoLacunaBusca } from './useAlterarEstadoLacunaBusca'

const API_URL = import.meta.env.VITE_API_URL

function criarWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function criarQueryClientComFilaEmCache() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(lacunasBuscaKeys.termos({ estado: 'Aberta' }), { items: [] })
  return queryClient
}

const filaInvalidada = (queryClient: QueryClient) =>
  queryClient.getQueryState(lacunasBuscaKeys.termos({ estado: 'Aberta' }))?.isInvalidated

describe('useAlterarEstadoLacunaBusca', () => {
  it('envia PUT em /{id}/estado com If-Match e o corpo da decisão, e devolve a alteração', async () => {
    const capturado: { url: string | null; ifMatch: string | null; corpo: unknown } = {
      url: null,
      ifMatch: null,
      corpo: null,
    }
    const resolvida = { ...LACUNA_RECORRENTE, estado: 'Resolvida', versaoConcorrencia: 8 }
    server.use(
      http.put(`${API_URL}/interno/lacunas-busca/41/estado`, async ({ request }) => {
        capturado.url = new URL(request.url).pathname
        capturado.ifMatch = request.headers.get('If-Match')
        capturado.corpo = await request.json()
        return HttpResponse.json({ data: { lacuna: resolvida, mesmoTermoAlteradas: 2 } })
      }),
    )

    const queryClient = criarQueryClientComFilaEmCache()
    const { result } = renderHook(() => useAlterarEstadoLacunaBusca(), {
      wrapper: criarWrapper(queryClient),
    })

    let alteracao
    await act(async () => {
      alteracao = await result.current.mutateAsync({
        id: 41,
        dto: { estado: 'Resolvida', nota: 'Artigo publicado', incluirMesmoTermo: true },
        etag: 'W/"7"',
      })
    })

    expect(capturado.url).toMatch(/\/interno\/lacunas-busca\/41\/estado$/)
    expect(capturado.ifMatch).toBe('W/"7"')
    expect(capturado.corpo).toEqual({
      estado: 'Resolvida',
      nota: 'Artigo publicado',
      incluirMesmoTermo: true,
    })
    expect(alteracao).toEqual({ lacuna: resolvida, mesmoTermoAlteradas: 2 })
    expect(filaInvalidada(queryClient)).toBe(true)
  })

  it('recarrega a fila também quando a escrita volta 409', async () => {
    server.use(
      http.put(`${API_URL}/interno/lacunas-busca/41/estado`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'CONFLITO_CONCORRENCIA',
              message: 'O recurso foi alterado por outra requisição.',
            },
          },
          { status: 409 },
        ),
      ),
    )

    const queryClient = criarQueryClientComFilaEmCache()
    const { result } = renderHook(() => useAlterarEstadoLacunaBusca(), {
      wrapper: criarWrapper(queryClient),
    })

    await act(async () => {
      await result.current
        .mutateAsync({ id: 41, dto: { estado: 'Descartada' }, etag: 'W/"7"' })
        .catch(() => undefined)
    })

    expect(filaInvalidada(queryClient)).toBe(true)
  })
})
