import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { useVersaoAdminPorId } from '../../provedores/hooks/useVersaoAdminPorId'
import { useRemoverExemplo } from './useRemoverExemplo'

const API_URL = import.meta.env.VITE_API_URL

const VERSAO_ID = 10
const EXEMPLO_ID = 1

function versaoComConcorrencia(versaoConcorrencia: number) {
  return {
    id: VERSAO_ID,
    provedorId: 4,
    versaoLayoutId: 1,
    rotulo: 'ABRASF 2.03',
    introducao: null,
    verificadoEm: null,
    publicado: false,
    avisos: [],
    versaoConcorrencia,
  }
}

function criarWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function novoQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('useRemoverExemplo (I42)', () => {
  it('manda DELETE com If-Match e trata o 204 sem corpo', async () => {
    let ifMatch: string | null = null
    server.use(
      http.delete(`${API_URL}/interno/exemplos/${EXEMPLO_ID}`, ({ request }) => {
        ifMatch = request.headers.get('If-Match')
        return new HttpResponse(null, { status: 204 })
      }),
    )

    const { result } = renderHook(() => useRemoverExemplo(), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await act(async () => {
      await result.current.mutateAsync({ id: EXEMPLO_ID, versaoId: VERSAO_ID, etag: 'W/"7"' })
    })

    expect(ifMatch).toBe('W/"7"')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('renova o detalhe da versão pai (C5) - remover também toca a versão', async () => {
    let leiturasDaVersao = 0
    server.use(
      http.get(`${API_URL}/interno/versoes/${VERSAO_ID}`, () => {
        leiturasDaVersao += 1
        return HttpResponse.json({
          data: versaoComConcorrencia(leiturasDaVersao === 1 ? 5 : 6),
          message: null,
        })
      }),
      http.delete(
        `${API_URL}/interno/exemplos/${EXEMPLO_ID}`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    )

    const { result } = renderHook(
      () => ({
        versao: useVersaoAdminPorId(VERSAO_ID),
        remover: useRemoverExemplo(),
      }),
      { wrapper: criarWrapper(novoQueryClient()) },
    )

    await waitFor(() => expect(result.current.versao.data?.etag).toBe('W/"5"'))

    await act(async () => {
      await result.current.remover.mutateAsync({
        id: EXEMPLO_ID,
        versaoId: VERSAO_ID,
        etag: 'W/"7"',
      })
    })

    await waitFor(() => expect(result.current.versao.data?.etag).toBe('W/"6"'))
  })
})
