import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import {
  handlerLayoutVersaoCapExcedido,
  handlerLayoutVersaoDespublicada,
} from '../../../test/mocks/handlers'
import { server } from '../../../test/mocks/server'
import { ErroLayoutVersaoHttp, useLayoutVersao } from './useLayoutVersao'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de LayoutVersaoDto, sem o tipo do cliente.
const paginaFake = {
  versao: {
    slug: '4-13',
    rotulo: '4.13',
    estado: 'Prevista',
    ordem: 3,
    totalCampos: 2,
  },
  descricao: 'Alinhamento com o Ambiente de Dados Nacional.',
  anterior: { slug: '4-12', rotulo: '4.12', estado: 'Vigente', ordem: 2, totalCampos: 1 },
  totalCampos: 2,
  camposPorGrupo: [
    {
      grupo: 'Identificação',
      grupoSlug: 'identificacao',
      campos: [
        {
          slug: 'numero-do-rps',
          nome: 'Número do RPS',
          caminhoXml: 'Nfse/Rps/IdentificacaoRps/Numero',
          significado: 'Numeração sequencial do recibo.',
          ordem: 1,
          novoNestaVersao: false,
          descontinuadoNestaVersao: false,
          urlCanonica: '/layout/campos/numero-do-rps',
        },
      ],
    },
  ],
}

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useLayoutVersao', () => {
  it('lê o campo `.data` do envelope ApiResponse (P11)', async () => {
    server.use(
      http.get(`${API_URL}/layout/versoes/4-13`, () =>
        HttpResponse.json({ data: paginaFake, message: null }),
      ),
    )

    const { result } = renderHook(() => useLayoutVersao('4-13'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(paginaFake)
  })

  it('a leitura FALHA quando a resposta vem no envelope do vizinho (cru na raiz)', async () => {
    server.use(http.get(`${API_URL}/layout/versoes/4-13`, () => HttpResponse.json(paginaFake)))

    const { result } = renderHook(() => useLayoutVersao('4-13'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })

  it('404 vira "nao_encontrada" - a versão nunca existiu', async () => {
    server.use(
      http.get(`${API_URL}/layout/versoes/inexistente`, () =>
        HttpResponse.json(
          { error: { code: 'VERSAO_LAYOUT_NAO_ENCONTRADA', message: 'Não encontrada.' } },
          { status: 404 },
        ),
      ),
    )

    const { result } = renderHook(() => useLayoutVersao('inexistente'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const erro = result.current.error as ErroLayoutVersaoHttp
    expect(erro).toBeInstanceOf(ErroLayoutVersaoHttp)
    expect(erro.tipo).toBe('nao_encontrada')
    expect(erro.status).toBe(404)
  })

  it('410 vira "despublicada" - a versão existe e saiu do ar', async () => {
    server.use(handlerLayoutVersaoDespublicada('4-13'))

    const { result } = renderHook(() => useLayoutVersao('4-13'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const erro = result.current.error as ErroLayoutVersaoHttp
    expect(erro.tipo).toBe('despublicada')
    expect(erro.status).toBe(410)
  })

  it('422 vira "cap_excedido" - limite estrutural, distinto dos outros dois', async () => {
    server.use(handlerLayoutVersaoCapExcedido('4-13'))

    const { result } = renderHook(() => useLayoutVersao('4-13'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const erro = result.current.error as ErroLayoutVersaoHttp
    expect(erro.tipo).toBe('cap_excedido')
    expect(erro.status).toBe(422)
  })

  it('status sem tratamento nomeado não vira ErroLayoutVersaoHttp', async () => {
    server.use(
      http.get(`${API_URL}/layout/versoes/4-13`, () => HttpResponse.json({}, { status: 500 })),
    )

    const { result } = renderHook(() => useLayoutVersao('4-13'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).not.toBeInstanceOf(ErroLayoutVersaoHttp)
  })
})
