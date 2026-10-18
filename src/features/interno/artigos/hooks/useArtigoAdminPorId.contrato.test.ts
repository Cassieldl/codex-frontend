import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { JsonBodyType } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { useArtigoAdminPorId } from './useArtigoAdminPorId'

const API_URL = import.meta.env.VITE_API_URL

// JSON transcrito do `ArtigoAdminDto` do servidor, sem anotação do tipo do cliente.
const ERROS_DO_SERVIDOR = [
  { id: 12, codigo: 'E0037', titulo: 'Texto do erro', desativado: false },
  { id: 13, codigo: 'E0040', titulo: 'Erro removido', desativado: true },
]

const CAMPOS_DO_SERVIDOR = [
  {
    id: 40,
    nome: 'ValServicos',
    caminhoXml: 'Servico/Valores/ValServicos',
    versaoLayoutId: 3,
    versaoLayoutRotulo: '8',
    desativado: false,
  },
]

const DETALHE_DO_SERVIDOR = {
  id: 7,
  slug: 'retencao-de-iss',
  tipo: 'Conceito',
  titulo: 'Retenção de ISS',
  corpo: 'Texto.',
  publicado: true,
  reservado: false,
  verificadoEm: '2026-10-01',
  campoLayoutIds: [40],
  erroIds: [12, 13],
  erros: ERROS_DO_SERVIDOR,
  camposLayout: CAMPOS_DO_SERVIDOR,
  versaoConcorrencia: 5,
}

function responderCom(corpo: JsonBodyType) {
  server.use(http.get(`${API_URL}/interno/artigos/7`, () => HttpResponse.json(corpo)))
}

function renderizarHook() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderHook(() => useArtigoAdminPorId(7), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  })
}

function semChave(chave: string, novaChave: string) {
  const { [chave]: valor, ...resto } = DETALHE_DO_SERVIDOR as Record<string, unknown>
  return { ...resto, [novaChave]: valor }
}

describe('useArtigoAdminPorId: contrato do detalhe', () => {
  it('lê os vínculos rotulados nas chaves "erros" e "camposLayout"', async () => {
    responderCom({ data: DETALHE_DO_SERVIDOR, message: null })

    const { result } = renderizarHook()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.erros).toEqual(ERROS_DO_SERVIDOR)
    expect(result.current.data?.camposLayout).toEqual(CAMPOS_DO_SERVIDOR)
    expect(result.current.data?.erroIds).toEqual([12, 13])
    expect(result.current.data?.campoLayoutIds).toEqual([40])
  })

  it.each([
    ['erros', 'errosVinculados'],
    ['camposLayout', 'camposDoLayout'],
  ])('chave "%s" renomeada para "%s" falha e nomeia o que faltou', async (chave, novaChave) => {
    responderCom({ data: semChave(chave, novaChave), message: null })

    const { result } = renderizarHook()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe(
      `A resposta da API não trouxe a coleção "${chave}", que o contrato exige.`,
    )
  })

  it('o recurso cru, sem o envelope `data`, também falha', async () => {
    responderCom(DETALHE_DO_SERVIDOR)

    const { result } = renderizarHook()

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
