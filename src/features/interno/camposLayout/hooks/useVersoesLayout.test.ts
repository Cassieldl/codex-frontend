import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { useAtualizarVersaoLayout } from './useAtualizarVersaoLayout'
import { useVersoesLayout } from './useVersoesLayout'

const API_URL = import.meta.env.VITE_API_URL

/**
 * Shape REAL de `PaginatedResponse<VersaoLayoutAdminDto>` (I15a): `estado` é
 * campo obrigatório da resposta e os valores são os do enum
 * `EstadoVersaoLayout` do backend (`Prevista`/`Vigente`/`Anterior`) - nunca
 * `Ativo`/`Descontinuado`, que são estado de CAMPO canônico. Sem `etag` no
 * corpo: o validador viaja em `versaoConcorrencia`.
 */
const respostaVersoesLayout = {
  items: [
    {
      id: 5,
      rotulo: 'Layout 2.0',
      slug: 'layout-2-0',
      estado: 'Prevista',
      ordem: 2,
      publicado: false,
      descricao: 'Próxima versão do layout.',
      versaoConcorrencia: 4,
    },
    {
      id: 4,
      rotulo: 'Layout 1.0',
      slug: 'layout-1-0',
      estado: 'Vigente',
      ordem: 1,
      publicado: true,
      descricao: null,
      versaoConcorrencia: 9,
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

describe('useVersoesLayout (I15a)', () => {
  it('deriva o etag de cada item do versaoConcorrencia do corpo', async () => {
    server.use(
      http.get(`${API_URL}/interno/layout/versoes`, () => HttpResponse.json(respostaVersoesLayout)),
    )

    const { result } = renderHook(() => useVersoesLayout({ pagina: 1 }), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.items).toHaveLength(2)
    expect(result.current.data?.items[0].etag).toBe(
      `W/"${respostaVersoesLayout.items[0].versaoConcorrencia}"`,
    )
    expect(result.current.data?.items[1].etag).toBe(
      `W/"${respostaVersoesLayout.items[1].versaoConcorrencia}"`,
    )
  })

  it('preserva o estado da versão de layout devolvido pelo backend (P-15)', async () => {
    server.use(
      http.get(`${API_URL}/interno/layout/versoes`, () => HttpResponse.json(respostaVersoesLayout)),
    )

    const { result } = renderHook(() => useVersoesLayout({ pagina: 1 }), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.items.map((versao) => versao.estado)).toEqual([
      'Prevista',
      'Vigente',
    ])
  })

  it('a transição de estado (I15c) sai no corpo do PUT com o If-Match derivado da leitura', async () => {
    const requisicaoCapturada: { corpo: unknown; ifMatch: string | null } = {
      corpo: null,
      ifMatch: null,
    }
    server.use(
      http.get(`${API_URL}/interno/layout/versoes`, () => HttpResponse.json(respostaVersoesLayout)),
      http.put(`${API_URL}/interno/layout/versoes/5`, async ({ request }) => {
        requisicaoCapturada.corpo = await request.json()
        requisicaoCapturada.ifMatch = request.headers.get('If-Match')
        return HttpResponse.json({
          data: { ...respostaVersoesLayout.items[0], estado: 'Vigente' },
          message: null,
        })
      }),
    )

    const queryClient = novoQueryClient()
    const { result } = renderHook(
      () => ({ lista: useVersoesLayout({ pagina: 1 }), atualizar: useAtualizarVersaoLayout() }),
      { wrapper: criarWrapper(queryClient) },
    )

    await waitFor(() => expect(result.current.lista.isSuccess).toBe(true))

    const versaoDaLista = result.current.lista.data?.items[0]
    expect(versaoDaLista).toBeDefined()

    await act(async () => {
      await result.current.atualizar.mutateAsync({
        id: versaoDaLista!.id,
        dto: { rotulo: versaoDaLista!.rotulo, estado: 'Vigente' },
        etag: versaoDaLista!.etag,
      })
    })

    expect(requisicaoCapturada.ifMatch).toBe('W/"4"')
    expect(requisicaoCapturada.corpo).toEqual({ rotulo: 'Layout 2.0', estado: 'Vigente' })
  })
})
