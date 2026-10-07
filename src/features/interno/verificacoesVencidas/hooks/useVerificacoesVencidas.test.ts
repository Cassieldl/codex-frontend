import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import {
  VERSAO_NUNCA_VERIFICADA,
  VERSAO_VERIFICADA_HA_90_DIAS,
  respostaListaVerificacoesVencidas,
} from '../../../../test/mocks/verificacoesVencidas'
import { useVerificacoesVencidas } from './useVerificacoesVencidas'

const API_URL = import.meta.env.VITE_API_URL
const URL_LISTA = `${API_URL}/interno/versoes/verificacoes-vencidas`

function criarWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useVerificacoesVencidas', () => {
  it('manda o prazo e a paginação na query', async () => {
    const capturado: { url: URL | null } = { url: null }
    server.use(
      http.get(URL_LISTA, ({ request }) => {
        capturado.url = new URL(request.url)
        return HttpResponse.json(respostaListaVerificacoesVencidas([VERSAO_NUNCA_VERIFICADA]))
      }),
    )

    const { result } = renderHook(
      () => useVerificacoesVencidas({ dias: 180, pagina: 2, tamanhoPagina: 50 }),
      { wrapper: criarWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(Object.fromEntries(capturado.url!.searchParams)).toEqual({
      dias: '180',
      pagina: '2',
      tamanhoPagina: '50',
    })
  })

  it('entrega os itens na ordem recebida, sem reordenar', async () => {
    server.use(
      http.get(URL_LISTA, () =>
        HttpResponse.json(
          respostaListaVerificacoesVencidas([
            VERSAO_NUNCA_VERIFICADA,
            VERSAO_VERIFICADA_HA_90_DIAS,
          ]),
        ),
      ),
    )

    const { result } = renderHook(
      () => useVerificacoesVencidas({ dias: 90, pagina: 1, tamanhoPagina: 25 }),
      { wrapper: criarWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.items.map((item) => item.versaoId)).toEqual([12, 11])
    expect(result.current.data?.totalCount).toBe(2)
  })

  /**
   * O GET é cru na raiz. Se o hook passasse a ler `data.items` (o envelope do vizinho), uma
   * resposta enveloped seria aceita e o teste de contrato acima continuaria verde com o mock
   * errado. Aqui o envelope invertido tem de FALHAR, nomeando a coleção que faltou.
   */
  it('recusa a lista enveloped em data — o contrato é cru na raiz', async () => {
    server.use(
      http.get(URL_LISTA, () =>
        HttpResponse.json({
          data: respostaListaVerificacoesVencidas([VERSAO_NUNCA_VERIFICADA]),
          message: null,
        }),
      ),
    )

    const { result } = renderHook(
      () => useVerificacoesVencidas({ dias: 90, pagina: 1, tamanhoPagina: 25 }),
      { wrapper: criarWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(String(result.current.error)).toContain('items')
  })
})
