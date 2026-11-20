import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import type { ArtigoFormDto } from '../types/artigoAdmin'
import { useArtigoAdminPorId } from './useArtigoAdminPorId'
import { useAtualizarArtigo } from './useAtualizarArtigo'
import { useCriarArtigo } from './useCriarArtigo'
import { usePublicarArtigo } from './usePublicarArtigo'
import { useRemoverArtigo } from './useRemoverArtigo'
import { useVerificarArtigo } from './useVerificarArtigo'

const API_URL = import.meta.env.VITE_API_URL

/** Corpo de `GET /interno/artigos/{id}` (I24) - enveloped, com `versaoConcorrencia` e sem `etag`. */
const detalheDoServidor = {
  id: 42,
  slug: 'migrar-para-abrasf-204',
  tipo: 'Mudanca',
  titulo: 'Migrar para ABRASF 2.04',
  corpo: '## Antes de comecar\n\nConfira a versao do provedor.',
  publicado: false,
  reservado: false,
  verificadoEm: null,
  campoLayoutIds: [3, 8],
  erroIds: [17],
  erros: [{ id: 17, codigo: 'E0117', titulo: 'RPS invalido', desativado: false }],
  camposLayout: [
    {
      id: 3,
      nome: 'Discriminacao',
      caminhoXml: 'Rps/Discriminacao',
      versaoLayoutId: 2,
      versaoLayoutRotulo: '7',
      desativado: false,
    },
    {
      id: 8,
      nome: 'CodigoServico',
      caminhoXml: 'Servico/CodigoServico',
      versaoLayoutId: 2,
      versaoLayoutRotulo: '7',
      desativado: false,
    },
  ],
  versaoConcorrencia: 31,
}

const dtoDeEscrita: ArtigoFormDto = {
  titulo: 'Migrar para ABRASF 2.04',
  tipo: 'Mudanca',
  corpo: '## Antes de comecar',
  campoLayoutIds: [3, 8],
  erroIds: [17],
}

function criarWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function novoQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('escrita de artigo: If-Match derivado da leitura (I24 → I26/I27/I28/I29)', () => {
  it('I24 traz corpo e os ids de referência cruzada, e deriva o etag do versaoConcorrencia', async () => {
    server.use(
      http.get(`${API_URL}/interno/artigos/42`, () =>
        HttpResponse.json({ data: detalheDoServidor, message: null }),
      ),
    )

    const { result } = renderHook(() => useArtigoAdminPorId(42), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Os três campos que a listagem NÃO tem - sem eles o modal abre vazio.
    expect(result.current.data?.corpo).toBe(detalheDoServidor.corpo)
    expect(result.current.data?.campoLayoutIds).toEqual([3, 8])
    expect(result.current.data?.erroIds).toEqual([17])
    expect(result.current.data?.etag).toBe('W/"31"')
  })

  it('não busca detalhe enquanto nenhum artigo está aberto', () => {
    // Sem handler registrado: qualquer requisição derrubaria o teste
    // (`onUnhandledRequest: 'error'` no setup da suíte).
    const { result } = renderHook(() => useArtigoAdminPorId(null), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('atualizar, remover, publicar e verificar mandam o If-Match que veio do detalhe', async () => {
    const capturado: Record<string, string | null> = {
      put: null,
      del: null,
      pub: null,
      verificacao: null,
    }
    server.use(
      http.put(`${API_URL}/interno/artigos/42`, ({ request }) => {
        capturado.put = request.headers.get('If-Match')
        return HttpResponse.json({ data: detalheDoServidor, message: null })
      }),
      http.delete(`${API_URL}/interno/artigos/42`, ({ request }) => {
        capturado.del = request.headers.get('If-Match')
        return new HttpResponse(null, { status: 204 })
      }),
      http.put(`${API_URL}/interno/artigos/42/publicacao`, ({ request }) => {
        capturado.pub = request.headers.get('If-Match')
        return HttpResponse.json({ data: detalheDoServidor, message: null })
      }),
      http.put(`${API_URL}/interno/artigos/42/verificacao`, ({ request }) => {
        capturado.verificacao = request.headers.get('If-Match')
        return HttpResponse.json({ data: detalheDoServidor, message: null })
      }),
    )

    const etag = `W/"${detalheDoServidor.versaoConcorrencia}"`
    const wrapper = criarWrapper(novoQueryClient())

    const atualizar = renderHook(() => useAtualizarArtigo(), { wrapper })
    const remover = renderHook(() => useRemoverArtigo(), { wrapper })
    const publicar = renderHook(() => usePublicarArtigo(), { wrapper })
    const verificar = renderHook(() => useVerificarArtigo(), { wrapper })

    await act(async () => {
      await atualizar.result.current.mutateAsync({ id: 42, dto: dtoDeEscrita, etag })
      await remover.result.current.mutateAsync({ id: 42, etag })
      await publicar.result.current.mutateAsync({ id: 42, publicado: true, etag })
      await verificar.result.current.mutateAsync({ id: 42, verificadoEm: '2026-09-14', etag })
    })

    expect(capturado.put).toBe(etag)
    expect(capturado.del).toBe(etag)
    expect(capturado.pub).toBe(etag)
    expect(capturado.verificacao).toBe(etag)
  })

  it('criar não envia If-Match - o recurso ainda não existe, não há versão a conferir', async () => {
    const capturado: { ifMatch: string | null; corpo: unknown } = { ifMatch: null, corpo: null }
    server.use(
      http.post(`${API_URL}/interno/artigos`, async ({ request }) => {
        capturado.ifMatch = request.headers.get('If-Match')
        capturado.corpo = await request.json()
        return HttpResponse.json(
          { data: detalheDoServidor, message: 'Artigo criado com sucesso.' },
          { status: 201 },
        )
      }),
    )

    const { result } = renderHook(() => useCriarArtigo(), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await act(async () => {
      await result.current.mutateAsync(dtoDeEscrita)
    })

    expect(capturado.ifMatch).toBeNull()
    // `slug` e `publicado` nunca viajam na escrita: o slug é derivado do
    // título no servidor e a publicação só muda por I28 (M19).
    expect(capturado.corpo).toEqual(dtoDeEscrita)
    expect(capturado.corpo).not.toHaveProperty('slug')
    expect(capturado.corpo).not.toHaveProperty('publicado')
  })

  it('I29 manda a data pura no campo verificadoEm, sem hora nem offset', async () => {
    const capturado: { corpo: Record<string, unknown> | null } = { corpo: null }
    server.use(
      http.put(`${API_URL}/interno/artigos/42/verificacao`, async ({ request }) => {
        capturado.corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ data: detalheDoServidor, message: null })
      }),
    )

    const { result } = renderHook(() => useVerificarArtigo(), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await act(async () => {
      await result.current.mutateAsync({ id: 42, verificadoEm: '2026-09-14', etag: 'W/"31"' })
    })

    expect(capturado.corpo).toEqual({ verificadoEm: '2026-09-14' })
  })

  it('publicar manda { publicado } no corpo - nunca o artigo inteiro', async () => {
    const capturado: { corpo: unknown } = { corpo: null }
    server.use(
      http.put(`${API_URL}/interno/artigos/42/publicacao`, async ({ request }) => {
        capturado.corpo = await request.json()
        return HttpResponse.json({ data: detalheDoServidor, message: null })
      }),
    )

    const { result } = renderHook(() => usePublicarArtigo(), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await act(async () => {
      await result.current.mutateAsync({ id: 42, publicado: false, etag: 'W/"31"' })
    })

    expect(capturado.corpo).toEqual({ publicado: false })
  })
})
