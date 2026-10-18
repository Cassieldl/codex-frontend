import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { criarQueryClient, deveRetentarConsulta } from './queryClient'
import { apiPublico } from './services/api'
import { server } from './test/mocks/server'

const API_URL = import.meta.env.VITE_API_URL

function erroHttp(status: number): AxiosError {
  return new AxiosError('falha', String(status), undefined, null, {
    data: {},
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  })
}

/** Conta as requisições que a consulta fez até desistir, com o QueryClient da aplicação. */
async function contarTentativas(status: number): Promise<number> {
  let requisicoes = 0
  server.use(
    http.get(`${API_URL}/recurso-de-teste`, () => {
      requisicoes += 1
      return new HttpResponse(null, { status })
    }),
  )

  const queryClient = criarQueryClient()
  // Só o atraso sai do caminho; a decisão de retentar continua sendo a da aplicação.
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
  })
  const envolver = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  const { result } = renderHook(
    () =>
      useQuery({
        queryKey: ['recurso-de-teste', status],
        queryFn: async () => (await apiPublico.get('/recurso-de-teste')).data,
      }),
    { wrapper: envolver },
  )

  await waitFor(() => expect(result.current.isError).toBe(true))
  return requisicoes
}

describe('deveRetentarConsulta', () => {
  it.each([400, 401, 403, 404, 410, 422])('desiste na hora de um %i', (status) => {
    expect(deveRetentarConsulta(0, erroHttp(status))).toBe(false)
  })

  it.each([500, 502, 503])('insiste num %i', (status) => {
    expect(deveRetentarConsulta(0, erroHttp(status))).toBe(true)
  })

  it('insiste quando a rede caiu (sem resposta)', () => {
    expect(deveRetentarConsulta(0, new AxiosError('Network Error', 'ERR_NETWORK'))).toBe(true)
  })

  it('para depois de 3 retentativas', () => {
    expect(deveRetentarConsulta(2, erroHttp(503))).toBe(true)
    expect(deveRetentarConsulta(3, erroHttp(503))).toBe(false)
  })
})

describe('criarQueryClient', () => {
  it('um 404 vira erro na primeira tentativa', async () => {
    expect(await contarTentativas(404)).toBe(1)
  })

  it('um 503 é tentado de novo até o limite', async () => {
    expect(await contarTentativas(503)).toBe(4)
  })
})

describe('main.tsx', () => {
  it('monta a aplicação com o QueryClient que carrega a política, nunca um cliente cru', async () => {
    const fontes = import.meta.glob<string>('./main.tsx', { query: '?raw', import: 'default' })
    const carregar = fontes['./main.tsx']
    expect(carregar).toBeDefined()

    const fonte = await carregar!()

    expect(fonte).toContain('criarQueryClient()')
    expect(fonte).not.toMatch(/new QueryClient\(/)
  })
})
