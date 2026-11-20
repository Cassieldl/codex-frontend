import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { usePublicarProvedor } from '../../hooks/usePublicarProvedor'
import { useProvedoresAdmin } from './useProvedoresAdmin'

const API_URL = import.meta.env.VITE_API_URL

/**
 * Corpo de `GET /interno/provedores` (I1) com o shape REAL de
 * `PaginatedResponse<ProvedorAdminListaItemDto>`: cada item traz
 * `versaoConcorrencia` e **nenhum** campo `etag` - o backend nunca devolveu
 * `etag` no corpo. Nenhum literal `W/"…"` aparece nesta fixture de propósito:
 * o valor esperado no `If-Match` tem de ser DERIVADO daqui.
 */
const respostaLista = {
  items: [
    {
      id: 42,
      slug: 'prefeitura-exemplo',
      nome: 'Prefeitura de Exemplo',
      categoria: 'Nacional',
      identificadorInvoicy: 'PREF-EXEMPLO',
      publicado: false,
      versaoConcorrencia: 12,
    },
    {
      id: 43,
      slug: 'outra-prefeitura',
      nome: 'Outra Prefeitura',
      categoria: 'Proprio',
      identificadorInvoicy: 'OUTRA-PREF',
      publicado: true,
      versaoConcorrencia: 8,
    },
  ],
  totalCount: 2,
  page: 1,
  pageSize: 25,
  totalPages: 1,
}

function criarWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function novoQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('useProvedoresAdmin (I1): validador de concorrência do item de lista', () => {
  it('deriva o etag de cada item do versaoConcorrencia do corpo', async () => {
    server.use(http.get(`${API_URL}/interno/provedores`, () => HttpResponse.json(respostaLista)))

    const { result } = renderHook(() => useProvedoresAdmin({ pagina: 1 }), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Guarda de vacuidade: sem itens, as asserções abaixo passariam à toa.
    expect(result.current.data?.items).toHaveLength(2)
    expect(result.current.data?.items[0].etag).toBe(
      `W/"${respostaLista.items[0].versaoConcorrencia}"`,
    )
    expect(result.current.data?.items[1].etag).toBe(
      `W/"${respostaLista.items[1].versaoConcorrencia}"`,
    )
  })

  it('o corpo da resposta real não tem campo etag - o valor é derivado, nunca repassado', () => {
    for (const item of respostaLista.items) {
      expect(item).not.toHaveProperty('etag')
    }
    expect(respostaLista.items).not.toHaveLength(0)
  })

  it('o If-Match da publicação vem do etag derivado na leitura, não de literal de fixture', async () => {
    const requisicaoCapturada: { ifMatch: string | null } = { ifMatch: null }
    server.use(
      http.get(`${API_URL}/interno/provedores`, () => HttpResponse.json(respostaLista)),
      http.put(`${API_URL}/interno/provedores/42/publicacao`, ({ request }) => {
        requisicaoCapturada.ifMatch = request.headers.get('If-Match')
        return HttpResponse.json({ data: { ...respostaLista.items[0], publicado: true } })
      }),
    )

    const queryClient = novoQueryClient()
    const { result } = renderHook(
      () => ({ lista: useProvedoresAdmin({ pagina: 1 }), publicar: usePublicarProvedor() }),
      { wrapper: criarWrapper(queryClient) },
    )

    await waitFor(() => expect(result.current.lista.isSuccess).toBe(true))

    const provedorDaLista = result.current.lista.data?.items[0]
    expect(provedorDaLista).toBeDefined()

    await act(async () => {
      await result.current.publicar.mutateAsync({
        id: provedorDaLista!.id,
        publicado: true,
        etag: provedorDaLista!.etag,
      })
    })

    // O header chega ao formato que `IfMatchExtensoes.ExigirIfMatch` aceita, e
    // com o valor que veio do banco - a junção que a demanda nunca provou.
    expect(requisicaoCapturada.ifMatch).toBe('W/"12"')
  })
})
