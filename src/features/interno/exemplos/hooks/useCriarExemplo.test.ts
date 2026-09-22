import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { useVersaoAdminPorId } from '../../provedores/hooks/useVersaoAdminPorId'
import type { CriarExemploDto } from '../types/exemploAdmin'
import { useCriarExemplo } from './useCriarExemplo'

const API_URL = import.meta.env.VITE_API_URL

const VERSAO_ID = 10

const dto: CriarExemploDto = {
  nome: 'Nota simples',
  descricao: 'Serviço único, sem retenção.',
  xml: '<nfse />',
}

const exemploCriado = {
  id: 1,
  versaoProvedorId: VERSAO_ID,
  slug: 'nota-simples',
  nome: 'Nota simples',
  descricao: 'Serviço único, sem retenção.',
  xml: '<nfse />',
  versaoConcorrencia: 2,
}

function versaoComConcorrencia(versaoConcorrencia: number) {
  return {
    id: VERSAO_ID,
    provedorId: 4,
    versaoLayoutId: 1,
    rotulo: 'ABRASF 2.03',
    introducao: null,
    verificadoEm: null,
    publicado: false,
    avisos: [],
    versaoConcorrencia,
  }
}

function criarWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function novoQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('useCriarExemplo (I39)', () => {
  it('posta na coleção da versão, sem If-Match, e lê o exemplo do envelope { data }', async () => {
    const capturado: { ifMatch: string | null; corpo: unknown } = { ifMatch: null, corpo: null }
    server.use(
      http.post(`${API_URL}/interno/versoes/${VERSAO_ID}/exemplos`, async ({ request }) => {
        capturado.ifMatch = request.headers.get('If-Match')
        capturado.corpo = await request.json()
        return HttpResponse.json(
          { data: exemploCriado, message: 'Exemplo criado com sucesso.' },
          { status: 201 },
        )
      }),
    )

    const { result } = renderHook(() => useCriarExemplo(VERSAO_ID), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    let retorno: { slug: string } | undefined
    await act(async () => {
      retorno = await result.current.mutateAsync(dto)
    })

    expect(capturado.ifMatch).toBeNull()
    // `slug` NUNCA no body: é derivado do nome pelo backend.
    expect(capturado.corpo).toEqual(dto)
    expect(retorno?.slug).toBe('nota-simples')
  })

  it('renova o detalhe da versão pai: C5 avança o xmin dela a cada escrita de exemplo', async () => {
    let leiturasDaVersao = 0
    server.use(
      http.get(`${API_URL}/interno/versoes/${VERSAO_ID}`, () => {
        leiturasDaVersao += 1
        // A 1ª leitura é a da tela; a 2ª é a que a invalidação força depois da
        // criação. O xmin muda entre as duas porque o backend tocou a versão.
        return HttpResponse.json({
          data: versaoComConcorrencia(leiturasDaVersao === 1 ? 5 : 6),
          message: null,
        })
      }),
      http.post(`${API_URL}/interno/versoes/${VERSAO_ID}/exemplos`, () =>
        HttpResponse.json({ data: exemploCriado, message: null }, { status: 201 }),
      ),
    )

    const wrapper = criarWrapper(novoQueryClient())
    const { result } = renderHook(
      () => ({
        versao: useVersaoAdminPorId(VERSAO_ID),
        criar: useCriarExemplo(VERSAO_ID),
      }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.versao.isSuccess).toBe(true))
    expect(result.current.versao.data?.etag).toBe('W/"5"')

    await act(async () => {
      await result.current.criar.mutateAsync(dto)
    })

    // Sem esta renovação, o próximo PUT de verificação/publicação da versão
    // mandaria `W/"5"` e levaria 409 sem que a tela soubesse explicar por quê.
    await waitFor(() => expect(result.current.versao.data?.etag).toBe('W/"6"'))
  })

  it('422 do cap de 10 exemplos (C3) propaga para quem chamou', async () => {
    server.use(
      http.post(`${API_URL}/interno/versoes/${VERSAO_ID}/exemplos`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'LIMITE_EXCEDIDO',
              message: 'A versão já possui 10 exemplos, no limite de 10 (C3).',
            },
          },
          { status: 422 },
        ),
      ),
    )

    const { result } = renderHook(() => useCriarExemplo(VERSAO_ID), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await act(async () => {
      await expect(result.current.mutateAsync(dto)).rejects.toThrow()
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
