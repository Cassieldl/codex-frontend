import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { useVersaoAdminPorId } from '../../provedores/hooks/useVersaoAdminPorId'
import { useAtualizarExemplo } from './useAtualizarExemplo'

const API_URL = import.meta.env.VITE_API_URL

const VERSAO_ID = 10
const EXEMPLO_ID = 1

const dto = { nome: 'Nota simples revisada', descricao: undefined, xml: '<nfse />' }

const exemploAtualizado = {
  id: EXEMPLO_ID,
  versaoProvedorId: VERSAO_ID,
  slug: 'nota-simples',
  nome: 'Nota simples revisada',
  descricao: null,
  xml: '<nfse />',
  versaoConcorrencia: 8,
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

describe('useAtualizarExemplo (I41)', () => {
  it('manda If-Match com o etag do exemplo e não recalcula slug no body', async () => {
    const capturado: { ifMatch: string | null; corpo: unknown } = { ifMatch: null, corpo: null }
    server.use(
      http.put(`${API_URL}/interno/exemplos/${EXEMPLO_ID}`, async ({ request }) => {
        capturado.ifMatch = request.headers.get('If-Match')
        capturado.corpo = await request.json()
        return HttpResponse.json({ data: exemploAtualizado, message: null })
      }),
    )

    const { result } = renderHook(() => useAtualizarExemplo(), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await act(async () => {
      await result.current.mutateAsync({
        id: EXEMPLO_ID,
        versaoId: VERSAO_ID,
        dto,
        etag: 'W/"7"',
      })
    })

    expect(capturado.ifMatch).toBe('W/"7"')
    expect(capturado.corpo).not.toHaveProperty('slug')
  })

  it('renova o detalhe da versão pai (C5), igual à criação', async () => {
    let leiturasDaVersao = 0
    server.use(
      http.get(`${API_URL}/interno/versoes/${VERSAO_ID}`, () => {
        leiturasDaVersao += 1
        return HttpResponse.json({
          data: versaoComConcorrencia(leiturasDaVersao === 1 ? 5 : 6),
          message: null,
        })
      }),
      http.put(`${API_URL}/interno/exemplos/${EXEMPLO_ID}`, () =>
        HttpResponse.json({ data: exemploAtualizado, message: null }),
      ),
    )

    const { result } = renderHook(
      () => ({
        versao: useVersaoAdminPorId(VERSAO_ID),
        atualizar: useAtualizarExemplo(),
      }),
      { wrapper: criarWrapper(novoQueryClient()) },
    )

    await waitFor(() => expect(result.current.versao.data?.etag).toBe('W/"5"'))

    await act(async () => {
      await result.current.atualizar.mutateAsync({
        id: EXEMPLO_ID,
        versaoId: VERSAO_ID,
        dto,
        etag: 'W/"7"',
      })
    })

    await waitFor(() => expect(result.current.versao.data?.etag).toBe('W/"6"'))
  })
})
