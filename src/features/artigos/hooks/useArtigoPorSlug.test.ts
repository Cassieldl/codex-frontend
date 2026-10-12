import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { isAxiosError } from 'axios'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import type { ArtigoDetalhe } from '../types/artigo'
import { useArtigoPorSlug } from './useArtigoPorSlug'

const API_URL = import.meta.env.VITE_API_URL

const artigo: ArtigoDetalhe = {
  slug: 'campo-ausente-nao-se-aplica',
  tipo: 'Conceito',
  titulo: 'Campo ausente quer dizer "não se aplica"',
  corpo: '## Por que isso acontece\n\nCada município publica o próprio layout.',
  verificadoEm: '2026-08-14',
  urlCanonica: '/artigos/campo-ausente-nao-se-aplica',
  reservado: false,
  camposLayoutRelacionados: [
    {
      rotulo: 'CAMPO DO LAYOUT',
      slug: 'cnpj-tomador',
      nome: 'CNPJ do tomador',
      caminhoXml: '//Tomador/TomaCNPJ',
      significado: 'CNPJ do tomador do serviço.',
      url: '/layout/campos/cnpj-tomador',
    },
  ],
  errosRelacionados: [
    {
      rotulo: 'REJEIÇÃO',
      slug: 'e0117-cnpj-tomador-invalido',
      codigo: 'E0117',
      titulo: 'CNPJ do tomador inválido',
      url: '/erros/e0117-cnpj-tomador-invalido',
    },
  ],
}

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useArtigoPorSlug', () => {
  it('lê o campo `.data` do envelope ApiResponse — nunca a raiz de P7', async () => {
    server.use(
      http.get(`${API_URL}/artigos/${artigo.slug}`, () =>
        HttpResponse.json({ data: artigo, message: null }),
      ),
    )

    const { result } = renderHook(() => useArtigoPorSlug(artigo.slug), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(artigo)
  })

  it('preserva o acento de "REJEIÇÃO" e o link do campo de layout', async () => {
    server.use(
      http.get(`${API_URL}/artigos/${artigo.slug}`, () =>
        HttpResponse.json({ data: artigo, message: null }),
      ),
    )

    const { result } = renderHook(() => useArtigoPorSlug(artigo.slug), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.errosRelacionados[0]?.rotulo).toBe('REJEIÇÃO')
    expect(result.current.data?.camposLayoutRelacionados[0]?.url).toBe(
      '/layout/campos/cnpj-tomador',
    )
  })

  it('propaga 404 e 410 como status distintos, sem retry', async () => {
    server.use(
      http.get(`${API_URL}/artigos/nunca-existiu`, () =>
        HttpResponse.json(
          { error: { code: 'ARTIGO_NAO_ENCONTRADO', message: 'Artigo não encontrado.' } },
          { status: 404 },
        ),
      ),
      http.get(`${API_URL}/artigos/saiu-do-ar`, () =>
        HttpResponse.json(
          { error: { code: 'ARTIGO_DESPUBLICADO', message: 'Este artigo não está publicado.' } },
          { status: 410 },
        ),
      ),
    )

    const { result: resultado404 } = renderHook(() => useArtigoPorSlug('nunca-existiu'), {
      wrapper: envolverComQueryClient(),
    })
    const { result: resultado410 } = renderHook(() => useArtigoPorSlug('saiu-do-ar'), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(resultado404.current.isError).toBe(true))
    await waitFor(() => expect(resultado410.current.isError).toBe(true))

    const erro404 = resultado404.current.error
    const erro410 = resultado410.current.error

    expect(isAxiosError(erro404) && erro404.response?.status).toBe(404)
    expect(isAxiosError(erro410) && erro410.response?.status).toBe(410)
  })
})
