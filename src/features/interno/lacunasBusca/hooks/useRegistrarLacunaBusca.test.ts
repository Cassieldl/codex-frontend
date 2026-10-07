import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { LACUNA_RECORRENTE } from '../../../../test/mocks/lacunasBusca'
import { server } from '../../../../test/mocks/server'
import { lacunasBuscaKeys } from './lacunasBuscaKeys'
import { useRegistrarLacunaBusca } from './useRegistrarLacunaBusca'

const API_URL = import.meta.env.VITE_API_URL

function criarWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useRegistrarLacunaBusca', () => {
  it('envia só termo, parceiro e chamado — nada de identidade, nada de If-Match', async () => {
    const capturado: { corpo: unknown; ifMatch: string | null } = { corpo: null, ifMatch: null }
    server.use(
      http.post(`${API_URL}/interno/lacunas-busca`, async ({ request }) => {
        capturado.corpo = await request.json()
        capturado.ifMatch = request.headers.get('If-Match')
        return HttpResponse.json(
          { data: LACUNA_RECORRENTE, message: 'Lacuna registrada.' },
          { status: 201 },
        )
      }),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useRegistrarLacunaBusca(), {
      wrapper: criarWrapper(queryClient),
    })

    let registrada
    await act(async () => {
      registrada = await result.current.mutateAsync({
        termo: 'E0117 ipm',
        parceiro: 'Prefeitura de Exemplo',
        numeroChamado: '4521',
      })
    })

    expect(capturado.corpo).toEqual({
      termo: 'E0117 ipm',
      parceiro: 'Prefeitura de Exemplo',
      numeroChamado: '4521',
    })
    expect(capturado.ifMatch).toBeNull()
    expect(registrada).toEqual(LACUNA_RECORRENTE)
  })

  it('invalida as listas da fila ao registrar', async () => {
    server.use(
      http.post(`${API_URL}/interno/lacunas-busca`, () =>
        HttpResponse.json(
          { data: LACUNA_RECORRENTE, message: 'Lacuna registrada.' },
          { status: 201 },
        ),
      ),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(lacunasBuscaKeys.termos({ estado: 'Aberta' }), { items: [] })

    const { result } = renderHook(() => useRegistrarLacunaBusca(), {
      wrapper: criarWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({ termo: 'E0117 ipm' })
    })

    expect(
      queryClient.getQueryState(lacunasBuscaKeys.termos({ estado: 'Aberta' }))?.isInvalidated,
    ).toBe(true)
  })
})
