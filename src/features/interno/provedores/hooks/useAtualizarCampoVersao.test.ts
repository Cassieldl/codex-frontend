import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import type { AtualizarCampoVersaoDto, CampoVersaoAdmin } from '../types/campoVersaoAdmin'
import { useAtualizarCampoVersao } from './useAtualizarCampoVersao'

const API_URL = import.meta.env.VITE_API_URL

const dtoFake: AtualizarCampoVersaoDto = {
  campoLayoutId: 7,
  tipo: 'Texto',
  estadoPreenchimento: 'Obrigatorio',
  ordem: 1,
  notaPreenchimento: 'Parágrafo inteiro digitado pelo analista, não pode sumir em erro.',
}

const campoFake: CampoVersaoAdmin = {
  id: 99,
  campoLayoutId: 7,
  campoLayoutNome: 'Número da RPS',
  tipo: 'Texto',
  tamanho: null,
  mascara: null,
  dominio: null,
  estadoPreenchimento: 'Obrigatorio',
  condicao: null,
  exemplo: null,
  notaPreenchimento: dtoFake.notaPreenchimento ?? null,
  destinoXml: null,
  notaTransformacao: null,
  ordem: 1,
  versaoConcorrencia: 3,
}

function criarWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useAtualizarCampoVersao', () => {
  it('envia If-Match a partir do etag informado', async () => {
    const requisicaoCapturada: { ifMatch: string | null } = { ifMatch: null }
    server.use(
      http.put(`${API_URL}/interno/campos-versao/99`, ({ request }) => {
        requisicaoCapturada.ifMatch = request.headers.get('If-Match')
        return HttpResponse.json({ data: campoFake, message: null })
      }),
    )

    const { result } = renderHook(() => useAtualizarCampoVersao(), { wrapper: criarWrapper() })

    await act(async () => {
      await result.current.mutateAsync({ id: 99, dto: dtoFake, etag: 'W/"3"' })
    })

    expect(requisicaoCapturada.ifMatch).toBe('W/"3"')
  })

  it('em 409, não limpa o payload — mutation.variables continua com o que foi digitado', async () => {
    server.use(
      http.put(`${API_URL}/interno/campos-versao/99`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'CONFLITO_VERSAO',
              message: 'Este campo foi alterado por outra pessoa.',
            },
          },
          { status: 409 },
        ),
      ),
    )

    const { result } = renderHook(() => useAtualizarCampoVersao(), { wrapper: criarWrapper() })

    act(() => {
      result.current.mutate({ id: 99, dto: dtoFake, etag: 'W/"3"' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    // O payload inteiro (inclusive o texto longo digitado) continua acessível
    // via `variables` — nada foi descartado pela mutation (M9).
    expect(result.current.variables?.dto).toEqual(dtoFake)
    expect(result.current.variables?.dto.notaPreenchimento).toBe(dtoFake.notaPreenchimento)
  })
})
