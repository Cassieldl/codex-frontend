import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import { ErroEnvioModeloIndisponivel, useEnvioModelo } from './useEnvioModelo'

const API_URL = import.meta.env.VITE_API_URL
const URL_DO_ENVIO = `${API_URL}/provedores/prefeitura-exemplo/versoes/v1/envio-modelo`

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function renderizarHook() {
  return renderHook(
    () => useEnvioModelo('prefeitura-exemplo', 'v1', 'maximo', 'tomador-estrangeiro'),
    {
      wrapper: envolverComQueryClient(),
    },
  )
}

function respostaDe404(corpo: Record<string, unknown>) {
  return http.get(URL_DO_ENVIO, () => HttpResponse.json(corpo, { status: 404 }))
}

describe('useEnvioModelo', () => {
  it('pede o alcance e o cenário na query string e devolve o envio do envelope', async () => {
    let alcancePedido: string | null = null
    let cenarioPedido: string | null = null
    server.use(
      http.get(URL_DO_ENVIO, ({ request }) => {
        const busca = new URL(request.url).searchParams
        alcancePedido = busca.get('alcance')
        cenarioPedido = busca.get('cenario')
        return HttpResponse.json({
          data: {
            alcance: 'maximo',
            cenario: 'tomador-estrangeiro',
            cenariosDisponiveis: ['nacional', 'tomador-estrangeiro'],
            versaoLayoutRotulo: '8',
            xml: { nome: 'Envio', filhos: [] },
            json: { nome: 'Documento', filhos: [] },
            camposSemPosicao: ['servico-codigo-cnae'],
          },
          message: null,
        })
      }),
    )

    const { result } = renderizarHook()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(alcancePedido).toBe('maximo')
    expect(cenarioPedido).toBe('tomador-estrangeiro')
    expect(result.current.data?.camposSemPosicao).toEqual(['servico-codigo-cnae'])
  })

  it('codifica cada slug no caminho: barra e interrogação não mudam o endpoint chamado', async () => {
    let caminhoPedido = ''
    server.use(
      http.get(`${API_URL}/provedores/*`, ({ request }) => {
        caminhoPedido = new URL(request.url).pathname
        return HttpResponse.json({ data: null, message: null })
      }),
    )

    const { result } = renderHook(
      () => useEnvioModelo('a/b?c', 'v1#x', 'maximo', 'tomador-estrangeiro'),
      { wrapper: envolverComQueryClient() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(caminhoPedido.endsWith('/provedores/a%2Fb%3Fc/versoes/v1%23x/envio-modelo')).toBe(true)
  })

  it.each([
    ['envelope da API', { error: { code: 'ESTRUTURA_INDISPONIVEL', message: 'Sem estrutura.' } }],
    ['ProblemDetails', { title: 'Sem estrutura.', status: 404, code: 'ESTRUTURA_INDISPONIVEL' }],
  ])('404 ESTRUTURA_INDISPONIVEL no %s vira estrutura indisponível', async (_formato, corpo) => {
    server.use(respostaDe404(corpo))

    const { result } = renderizarHook()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ErroEnvioModeloIndisponivel)
    expect((result.current.error as ErroEnvioModeloIndisponivel).motivo).toBe(
      'estrutura_indisponivel',
    )
  })

  it('404 sem o código é a versão que não existe mais', async () => {
    server.use(respostaDe404({ error: { code: 'NAO_ENCONTRADO', message: 'Não encontrado.' } }))

    const { result } = renderizarHook()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as ErroEnvioModeloIndisponivel).motivo).toBe('nao_encontrado')
  })
})
