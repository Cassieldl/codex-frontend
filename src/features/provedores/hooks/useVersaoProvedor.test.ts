import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import type { VersaoProvedorPagina } from '../types/versaoProvedorPagina'
import { provedoresKeys } from './provedoresKeys'
import { ErroVersaoProvedorHttp, useVersaoProvedor } from './useVersaoProvedor'

const API_URL = import.meta.env.VITE_API_URL

const versaoPaginaFake: VersaoProvedorPagina = {
  provedor: {
    slug: 'prefeitura-exemplo',
    nome: 'Prefeitura de Exemplo',
    categoria: 'Nacional',
    identificadorInvoicy: 'EXEMPLO',
  },
  versao: {
    slug: 'v1',
    rotulo: 'Versão 1',
    verificadoEm: '2026-07-01T00:00:00Z',
    introducao: null,
    versaoLayoutRotulo: '2026.1',
  },
  camposPorGrupo: [],
  totalCampos: 0,
  avisos: [],
  errosResumo: { total: 0, itens: [] },
  // P4 sempre devolve a coleção, `[]` quando a versão não tem exemplo (C4).
  exemplos: [],
  outrasVersoes: [],
}

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useVersaoProvedor', () => {
  it('a queryKey inclui provedorSlug e versaoSlug', () => {
    expect(provedoresKeys.versao('prefeitura-exemplo', 'v1')).toEqual([
      'provedores',
      'versao',
      'prefeitura-exemplo',
      'v1',
    ])
    expect(provedoresKeys.versao('prefeitura-exemplo', 'v1')).not.toEqual(
      provedoresKeys.versao('prefeitura-exemplo', 'v2'),
    )
  })

  it('parseia o campo `.data` do envelope ApiResponse (P4)', async () => {
    server.use(
      http.get(`${API_URL}/provedores/prefeitura-exemplo/versoes/v1`, () =>
        HttpResponse.json({ data: versaoPaginaFake, message: null }),
      ),
    )

    const { result } = renderHook(() => useVersaoProvedor('prefeitura-exemplo', 'v1'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(versaoPaginaFake)
  })

  it('propaga 410 como "versao_despublicada" quando o código não aponta o provedor', async () => {
    server.use(
      http.get(`${API_URL}/provedores/prefeitura-exemplo/versoes/v1`, () =>
        HttpResponse.json(
          { error: { code: 'VERSAO_DESPUBLICADA', message: 'Esta versão saiu do ar.' } },
          { status: 410 },
        ),
      ),
    )

    const { result } = renderHook(() => useVersaoProvedor('prefeitura-exemplo', 'v1'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const erro = result.current.error as ErroVersaoProvedorHttp
    expect(erro).toBeInstanceOf(ErroVersaoProvedorHttp)
    expect(erro.tipo).toBe('versao_despublicada')
    expect(erro.status).toBe(410)
  })

  it('propaga 410 como "provedor_despublicado" quando o código aponta o ancestral', async () => {
    server.use(
      http.get(`${API_URL}/provedores/prefeitura-exemplo/versoes/v1`, () =>
        HttpResponse.json(
          { error: { code: 'PROVEDOR_DESPUBLICADO', message: 'Este provedor saiu do ar.' } },
          { status: 410 },
        ),
      ),
    )

    const { result } = renderHook(() => useVersaoProvedor('prefeitura-exemplo', 'v1'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const erro = result.current.error as ErroVersaoProvedorHttp
    expect(erro.tipo).toBe('provedor_despublicado')
  })
})
