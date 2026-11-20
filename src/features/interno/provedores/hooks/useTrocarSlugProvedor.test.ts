import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { provedoresAdminKeys } from './provedoresAdminKeys'
import { useTrocarSlugProvedor } from './useTrocarSlugProvedor'

const API_URL = import.meta.env.VITE_API_URL

const PROVEDOR_ID = 42

const provedorRenomeado = {
  id: PROVEDOR_ID,
  slug: 'prefeitura-de-sao-jose',
  nome: 'Prefeitura de São José',
  categoria: 'Nacional',
  identificadorInvoicy: 'PREF-SJ',
  aliases: [],
  publicado: true,
  avisos: [],
  versaoConcorrencia: 8,
}

function criarWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function novoQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('useTrocarSlugProvedor (I37)', () => {
  it('manda PUT /provedores/{id}/slug com { slug } e If-Match obrigatório', async () => {
    const capturado: { ifMatch: string | null; corpo: unknown } = { ifMatch: null, corpo: null }
    server.use(
      http.put(`${API_URL}/interno/provedores/${PROVEDOR_ID}/slug`, async ({ request }) => {
        capturado.ifMatch = request.headers.get('If-Match')
        capturado.corpo = await request.json()
        return HttpResponse.json({ data: provedorRenomeado, message: null })
      }),
    )

    const { result } = renderHook(() => useTrocarSlugProvedor(), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    let retorno: { slug: string } | undefined
    await act(async () => {
      retorno = await result.current.mutateAsync({
        id: PROVEDOR_ID,
        slug: 'prefeitura-de-sao-jose',
        etag: 'W/"7"',
      })
    })

    expect(capturado.ifMatch).toBe('W/"7"')
    expect(capturado.corpo).toEqual({ slug: 'prefeitura-de-sao-jose' })
    // O slug lido é o que o backend PERSISTIU (ele normaliza antes de gravar),
    // nunca o que o formulário digitou.
    expect(retorno?.slug).toBe('prefeitura-de-sao-jose')
  })

  it('falha quando a resposta vem CRUA, sem o envelope { data } de I37', async () => {
    server.use(
      http.put(`${API_URL}/interno/provedores/${PROVEDOR_ID}/slug`, () =>
        HttpResponse.json(provedorRenomeado),
      ),
    )

    const { result } = renderHook(() => useTrocarSlugProvedor(), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    let retorno: { slug?: string } | undefined
    await act(async () => {
      retorno = await result.current.mutateAsync({ id: PROVEDOR_ID, slug: 'x', etag: 'W/"7"' })
    })

    // Ler o envelope do vizinho não devolveria o recurso: `data` não existe na
    // raiz de uma resposta crua.
    expect(retorno?.slug).toBeUndefined()
  })

  it('invalida o detalhe E a listagem - o endereço aparece nos dois lugares', async () => {
    server.use(
      http.put(`${API_URL}/interno/provedores/${PROVEDOR_ID}/slug`, () =>
        HttpResponse.json({ data: provedorRenomeado, message: null }),
      ),
    )

    const queryClient = novoQueryClient()
    const chaveDetalhe = provedoresAdminKeys.detail(PROVEDOR_ID)
    const chaveLista = provedoresAdminKeys.list({ pagina: 1 })

    queryClient.setQueryData(chaveDetalhe, { slug: 'prefeitura-de-exemplo' })
    queryClient.setQueryData(chaveLista, { items: [] })

    const { result } = renderHook(() => useTrocarSlugProvedor(), {
      wrapper: criarWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        id: PROVEDOR_ID,
        slug: 'prefeitura-de-sao-jose',
        etag: 'W/"7"',
      })
    })

    await waitFor(() => {
      expect(queryClient.getQueryState(chaveDetalhe)?.isInvalidated).toBe(true)
      expect(queryClient.getQueryState(chaveLista)?.isInvalidated).toBe(true)
    })
  })
})
