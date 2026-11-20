import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { isAxiosError } from 'axios'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import { errosKeys } from './errosKeys'
import { useErroPorSlug } from './useErroPorSlug'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de ErroDetalheDto, sem o tipo do cliente.
const erroFake = {
  slug: 'e0117-cnpj-tomador-invalido',
  codigo: 'E0117',
  origem: 'Prefeitura',
  titulo: 'CNPJ do tomador inválido',
  variantes: ['CNPJ inválido para o tomador informado.'],
  causaProvavel: 'O CNPJ informado não passa na validação de dígito verificador.',
  solucaoSugerida: 'Corrija o CNPJ do tomador antes de reenviar a RPS.',
  versoesAplicaveis: [
    {
      provedorSlug: 'ipm-sistemas',
      provedorNome: 'IPM Sistemas',
      versaoSlug: '2-04',
      versaoRotulo: '2.04',
    },
  ],
  camposRelacionados: [
    {
      slug: 'cnpj-tomador',
      nome: 'CNPJ do tomador',
      caminhoXml: '//Tomador/TomaCNPJ',
      ancoras: [{ provedorSlug: 'ipm-sistemas', versaoSlug: '2-04' }],
    },
  ],
  // Sempre presente no contrato (PQ-08): `[]` quando o erro não tem artigo.
  artigosRelacionados: [],
}

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useErroPorSlug', () => {
  it('gera a queryKey a partir de errosKeys.detail', () => {
    expect(errosKeys.detail('e0117-cnpj-tomador-invalido')).toEqual([
      'erros',
      'detail',
      'e0117-cnpj-tomador-invalido',
    ])
  })

  it('parseia o campo `.data` do envelope ApiResponse, nunca `.items`', async () => {
    server.use(
      http.get(`${API_URL}/erros/e0117-cnpj-tomador-invalido`, () =>
        HttpResponse.json({ data: erroFake, message: null }),
      ),
    )

    const { result } = renderHook(() => useErroPorSlug('e0117-cnpj-tomador-invalido'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(erroFake)
  })

  it('codifica o slug no caminho: barra e interrogação não mudam o endpoint chamado', async () => {
    let caminhoPedido = ''
    server.use(
      http.get(`${API_URL}/erros/*`, ({ request }) => {
        caminhoPedido = new URL(request.url).pathname
        return HttpResponse.json({ data: erroFake, message: null })
      }),
    )

    const { result } = renderHook(() => useErroPorSlug('a/b?c'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(caminhoPedido.endsWith('/erros/a%2Fb%3Fc')).toBe(true)
  })

  it('trata 404 (nunca existiu) e 410 (existiu e saiu do ar) como casos distintos', async () => {
    server.use(
      http.get(`${API_URL}/erros/nunca-existiu`, () =>
        HttpResponse.json(
          { error: { code: 'ERRO_NAO_ENCONTRADO', message: 'Erro não encontrado.' } },
          { status: 404 },
        ),
      ),
      http.get(`${API_URL}/erros/foi-despublicado`, () =>
        HttpResponse.json(
          { error: { code: 'ERRO_DESPUBLICADO', message: 'Este erro não está mais publicado.' } },
          { status: 410 },
        ),
      ),
    )

    const { result: resultado404 } = renderHook(() => useErroPorSlug('nunca-existiu'), {
      wrapper: envolverComQueryClient(),
    })
    const { result: resultado410 } = renderHook(() => useErroPorSlug('foi-despublicado'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(resultado404.current.isError).toBe(true))
    await waitFor(() => expect(resultado410.current.isError).toBe(true))

    const erro404 = resultado404.current.error
    const erro410 = resultado410.current.error

    expect(isAxiosError(erro404) && erro404.response?.status).toBe(404)
    expect(isAxiosError(erro410) && erro410.response?.status).toBe(410)

    // Nunca colapsar os dois na mesma leitura de "não encontrado" (M7).
    const status404 = isAxiosError(erro404) ? erro404.response?.status : undefined
    const status410 = isAxiosError(erro410) ? erro410.response?.status : undefined
    expect(status404).not.toBe(status410)
  })
})
