import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import { ErroProvedorHttp, useProvedorPorSlug } from './useProvedorPorSlug'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de `ProvedorDetalheDto` / `AvisoPublicoDto`, sem anotação do tipo do
// cliente: anotar faria o compilador moldar o mock à crença do cliente em vez do servidor.
const provedorFake = {
  slug: 'prefeitura-exemplo',
  nome: 'Prefeitura de Exemplo',
  categoria: 'Nacional',
  identificadorInvoicy: 'EXEMPLO',
  avisos: [
    {
      id: 7,
      escopo: 'provedor',
      severidade: 'Critico',
      titulo: 'Instabilidade no ambiente da prefeitura',
      corpo: 'A prefeitura está reprocessando notas manualmente.',
      vigenciaInicio: '2026-08-01',
      camposAfetados: [],
    },
  ],
  versoes: [
    {
      slug: 'v1',
      rotulo: 'Versão 1',
      verificadoEm: '2026-07-01T00:00:00Z',
      url: '/provedores/prefeitura-exemplo/v1',
    },
    {
      slug: 'v2',
      rotulo: 'Versão 2',
      verificadoEm: '2026-08-01T00:00:00Z',
      url: '/provedores/prefeitura-exemplo/v2',
    },
  ],
}

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useProvedorPorSlug', () => {
  it('parseia o campo `.data` do envelope ApiResponse, incluindo `avisos` (U8)', async () => {
    server.use(
      http.get(`${API_URL}/provedores/prefeitura-exemplo`, () =>
        HttpResponse.json({ data: provedorFake, message: null }),
      ),
    )

    const { result } = renderHook(() => useProvedorPorSlug('prefeitura-exemplo'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(provedorFake)
    expect(result.current.data?.avisos).toHaveLength(1)
    expect(result.current.data?.avisos[0].escopo).toBe('provedor')
  })

  // Forma antiga do contrato: `camposAfetados` como `string[]`. Ler isso em silêncio mostraria
  // nomes `undefined`; a resposta tem de falhar e dizer qual coleção do contrato não veio.
  it('falha nomeando "camposAfetados" quando o aviso traz a forma antiga (string[])', async () => {
    const avisoComFormaAntiga = { ...provedorFake.avisos[0], camposAfetados: ['ISSRetido'] }
    server.use(
      http.get(`${API_URL}/provedores/prefeitura-exemplo`, () =>
        HttpResponse.json({
          data: { ...provedorFake, avisos: [avisoComFormaAntiga] },
          message: null,
        }),
      ),
    )

    const { result } = renderHook(() => useProvedorPorSlug('prefeitura-exemplo'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('"camposAfetados"')
  })

  it('falha nomeando "avisos" quando a coleção não chega', async () => {
    server.use(
      http.get(`${API_URL}/provedores/prefeitura-exemplo`, () =>
        HttpResponse.json({ data: { ...provedorFake, avisos: undefined }, message: null }),
      ),
    )

    const { result } = renderHook(() => useProvedorPorSlug('prefeitura-exemplo'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('"avisos"')
  })

  it('nunca marca nenhuma versão como "vigente" - só slug/rótulo/verificação/url', async () => {
    server.use(
      http.get(`${API_URL}/provedores/prefeitura-exemplo`, () =>
        HttpResponse.json({ data: provedorFake, message: null }),
      ),
    )

    const { result } = renderHook(() => useProvedorPorSlug('prefeitura-exemplo'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    for (const versao of result.current.data?.versoes ?? []) {
      expect(Object.keys(versao).sort()).toEqual(['rotulo', 'slug', 'url', 'verificadoEm'].sort())
    }
  })

  it('trata 404 como "nao_encontrado"', async () => {
    server.use(
      http.get(`${API_URL}/provedores/inexistente`, () =>
        HttpResponse.json(
          { error: { code: 'PROVEDOR_NAO_ENCONTRADO', message: 'Provedor não encontrado.' } },
          { status: 404 },
        ),
      ),
    )

    const { result } = renderHook(() => useProvedorPorSlug('inexistente'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ErroProvedorHttp)
    expect((result.current.error as ErroProvedorHttp).tipo).toBe('nao_encontrado')
  })

  it('trata 410 como "despublicado", distinto de 404 (M7)', async () => {
    server.use(
      http.get(`${API_URL}/provedores/despublicado`, () =>
        HttpResponse.json(
          { error: { code: 'PROVEDOR_DESPUBLICADO', message: 'Este provedor saiu do ar.' } },
          { status: 410 },
        ),
      ),
    )

    const { result } = renderHook(() => useProvedorPorSlug('despublicado'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const erro = result.current.error as ErroProvedorHttp
    expect(erro.tipo).toBe('despublicado')
    expect(erro.status).toBe(410)
  })

  // PQ-01 (`arquitetura.md` §5.F) - o `308` nunca chega ao cliente: o
  // `XMLHttpRequest` segue o redirect sozinho, e o que o hook recebe de
  // verdade é um `200` com o recurso do slug NOVO, ainda que a requisição
  // tenha sido feita para o slug antigo. Este mock simula exatamente o
  // efeito do auto-follow, não o `308` cru (que nenhum consumidor de browser
  // observa). Quem decide se a URL precisa ser corrigida é
  // `corrigirUrlCanonica`, consumido por `route.tsx` - não este hook.
  it('slug antigo respondido com 200 e o recurso do slug novo (PQ-01) - não é erro', async () => {
    const provedorComSlugNovo = { ...provedorFake, slug: 'slug-novo' }
    server.use(
      http.get(`${API_URL}/provedores/slug-antigo`, () =>
        HttpResponse.json({ data: provedorComSlugNovo, message: null }),
      ),
    )

    const { result } = renderHook(() => useProvedorPorSlug('slug-antigo'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.slug).toBe('slug-novo')
  })
})
