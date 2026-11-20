import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { useProvedorAdminPorId } from './useProvedorAdminPorId'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de `AvisoAdminDto`, sem anotação do tipo do cliente.
const avisoDoServidor = {
  id: 7,
  escopo: 'Provedor',
  provedorId: 1,
  versaoProvedorId: null,
  severidade: 'Informativo',
  titulo: 'Certificado digital expira em breve',
  corpo: 'Renove o certificado A1.',
  vigenciaInicio: '2026-08-01',
  publicado: false,
  camposAfetadosIds: [],
  versaoConcorrencia: 3,
}

const provedorDoServidor = {
  id: 1,
  slug: 'prefeitura-de-exemplo',
  nome: 'Prefeitura de Exemplo',
  categoria: 'Nacional',
  identificadorInvoicy: 'PREF-EXEMPLO',
  aliases: [],
  publicado: true,
  avisos: [avisoDoServidor],
  versaoConcorrencia: 2,
}

function envolverComQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function responderCom(provedor: unknown) {
  server.use(
    http.get(`${API_URL}/interno/provedores/1`, () =>
      HttpResponse.json({ data: provedor, message: null }),
    ),
  )
}

describe('useProvedorAdminPorId: avisos', () => {
  it('aviso de provedor chega com lista vazia de campos afetados', async () => {
    responderCom(provedorDoServidor)

    const { result } = renderHook(() => useProvedorAdminPorId(1), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.avisos[0].camposAfetadosIds).toEqual([])
    expect(result.current.data?.avisos[0].escopo).toBe('Provedor')
  })

  it('falha nomeando "camposAfetadosIds" quando o aviso não traz os ids', async () => {
    responderCom({
      ...provedorDoServidor,
      avisos: [{ ...avisoDoServidor, camposAfetadosIds: undefined }],
    })

    const { result } = renderHook(() => useProvedorAdminPorId(1), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('"camposAfetadosIds"')
  })
})
