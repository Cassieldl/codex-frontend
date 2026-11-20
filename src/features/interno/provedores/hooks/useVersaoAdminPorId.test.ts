import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { useVersaoAdminPorId } from './useVersaoAdminPorId'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de `AvisoAdminDto`, sem anotação do tipo do cliente.
const avisoDoServidor = {
  id: 12,
  escopo: 'Versao',
  provedorId: null,
  versaoProvedorId: 5,
  severidade: 'Alerta',
  titulo: 'ISSRetido passou a ser obrigatório',
  corpo: 'Primeiro parágrafo.\n\nSegundo parágrafo.',
  vigenciaInicio: '2026-10-05',
  publicado: true,
  camposAfetadosIds: [31, 47],
  versaoConcorrencia: 9,
}

const versaoDoServidor = {
  id: 5,
  provedorId: 1,
  versaoLayoutId: 2,
  rotulo: 'Versão 1',
  introducao: null,
  verificadoEm: null,
  publicado: true,
  avisos: [avisoDoServidor],
  versaoConcorrencia: 4,
}

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function responderCom(versao: unknown) {
  server.use(
    http.get(`${API_URL}/interno/versoes/5`, () =>
      HttpResponse.json({ data: versao, message: null }),
    ),
  )
}

describe('useVersaoAdminPorId: avisos', () => {
  it('entrega os ids dos campos afetados e o etag derivado de cada aviso', async () => {
    responderCom(versaoDoServidor)

    const { result } = renderHook(() => useVersaoAdminPorId(5), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.avisos[0].camposAfetadosIds).toEqual([31, 47])
    expect(result.current.data?.avisos[0].escopo).toBe('Versao')
    expect(result.current.data?.avisos[0].etag).toBe('W/"9"')
  })

  // Sem o campo, o formulário de edição partiria de `[]` e o PUT apagaria os vínculos gravados.
  it('falha nomeando "camposAfetadosIds" quando o aviso não traz os ids (forma antiga)', async () => {
    responderCom({
      ...versaoDoServidor,
      avisos: [{ ...avisoDoServidor, camposAfetadosIds: undefined, camposAfetados: ['ISSRetido'] }],
    })

    const { result } = renderHook(() => useVersaoAdminPorId(5), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('"camposAfetadosIds"')
  })
})
