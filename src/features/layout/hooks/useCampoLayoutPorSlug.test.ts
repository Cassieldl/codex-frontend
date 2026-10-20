import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { handlerCampoLayoutDespublicado } from '../../../test/mocks/handlers'
import { server } from '../../../test/mocks/server'
import { ErroCampoLayoutHttp, useCampoLayoutPorSlug } from './useCampoLayoutPorSlug'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de CampoLayoutVerbeteDto, sem o tipo do cliente.
const verbeteFake = {
  slug: 'numero-do-rps',
  nome: 'Número do RPS',
  caminhoXml: 'Nfse/Rps/IdentificacaoRps/Numero',
  significado: 'Numeração sequencial do recibo.',
  estado: 'Ativo',
  versaoExibicao: { slug: '4-12', rotulo: '4.12', estado: 'Vigente', ordem: 2, totalCampos: 58 },
  versaoOrigem: { slug: '4-10', rotulo: '4.10', estado: 'Anterior', ordem: 1, totalCampos: 55 },
  versaoDescontinuado: null,
  ondeEUsado: [],
}

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useCampoLayoutPorSlug', () => {
  it('lê o campo `.data` do envelope ApiResponse (P12)', async () => {
    server.use(
      http.get(`${API_URL}/layout/campos/numero-do-rps`, () =>
        HttpResponse.json({ data: verbeteFake, message: null }),
      ),
    )

    const { result } = renderHook(() => useCampoLayoutPorSlug('numero-do-rps'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(verbeteFake)
  })

  it('a leitura FALHA quando a resposta vem no envelope do vizinho (cru na raiz)', async () => {
    server.use(
      http.get(`${API_URL}/layout/campos/numero-do-rps`, () => HttpResponse.json(verbeteFake)),
    )

    const { result } = renderHook(() => useCampoLayoutPorSlug('numero-do-rps'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })

  it('404 vira "nao_encontrado"', async () => {
    server.use(
      http.get(`${API_URL}/layout/campos/inexistente`, () =>
        HttpResponse.json(
          { error: { code: 'CAMPO_LAYOUT_NAO_ENCONTRADO', message: 'Não encontrado.' } },
          { status: 404 },
        ),
      ),
    )

    const { result } = renderHook(() => useCampoLayoutPorSlug('inexistente'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const erro = result.current.error as ErroCampoLayoutHttp
    expect(erro).toBeInstanceOf(ErroCampoLayoutHttp)
    expect(erro.tipo).toBe('nao_encontrado')
  })

  it('410 com CAMPO_LAYOUT_DESPUBLICADO aponta o próprio verbete', async () => {
    server.use(handlerCampoLayoutDespublicado('numero-do-rps', 'CAMPO_LAYOUT_DESPUBLICADO'))

    const { result } = renderHook(() => useCampoLayoutPorSlug('numero-do-rps'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const erro = result.current.error as ErroCampoLayoutHttp
    expect(erro.tipo).toBe('campo_despublicado')
    expect(erro.status).toBe(410)
  })

  // P12 tem uma única causa observável de `410`. O backend emite CAMPO_LAYOUT_DESPUBLICADO
  // mesmo quando a origem é a versão — VERSAO_LAYOUT_DESPUBLICADA só sai em P11. Este teste
  // impede que alguém reintroduza um ramo que o backend nunca alcança.
  it('410 com VERSAO_LAYOUT_DESPUBLICADA continua sendo campo despublicado', async () => {
    server.use(handlerCampoLayoutDespublicado('numero-do-rps', 'VERSAO_LAYOUT_DESPUBLICADA'))

    const { result } = renderHook(() => useCampoLayoutPorSlug('numero-do-rps'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const erro = result.current.error as ErroCampoLayoutHttp
    expect(erro.tipo).toBe('campo_despublicado')
  })
})
