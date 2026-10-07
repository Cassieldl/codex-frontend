import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { verificacoesVencidasKeys } from '../../verificacoesVencidas/hooks/verificacoesVencidasKeys'
import { useVerificarVersao } from './useVerificarVersao'

const API_URL = import.meta.env.VITE_API_URL

describe('useVerificarVersao', () => {
  it('invalida a lista de verificações vencidas do Início ao verificar', async () => {
    server.use(
      http.put(`${API_URL}/interno/versoes/11/verificacao`, () =>
        HttpResponse.json({
          data: {
            id: 11,
            provedorId: 3,
            versaoLayoutId: 2,
            rotulo: '1.0 Contrato',
            introducao: null,
            verificadoEm: '2026-10-05',
            publicado: true,
            avisos: [],
            versaoConcorrencia: 5,
          },
          message: null,
        }),
      ),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const chaveDaLista = verificacoesVencidasKeys.list({ dias: 90, pagina: 1, tamanhoPagina: 25 })
    queryClient.setQueryData(chaveDaLista, { items: [] })

    const { result } = renderHook(() => useVerificarVersao(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children),
    })

    await act(async () => {
      result.current.mutate({ id: 11, verificadoEm: '2026-10-05', etag: 'W/"4"' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryState(chaveDaLista)?.isInvalidated).toBe(true)
  })
})
