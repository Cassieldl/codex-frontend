import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../test/mocks/server'
import { useCampoLayoutPorSlug } from './layout/hooks/useCampoLayoutPorSlug'
import { useLayoutVersao } from './layout/hooks/useLayoutVersao'
import { useProvedorPorSlug } from './provedores/hooks/useProvedorPorSlug'
import { useVersaoProvedor } from './provedores/hooks/useVersaoProvedor'

const API_URL = import.meta.env.VITE_API_URL

interface HookPublico {
  nome: string
  caminho: string
  useConsulta: () => UseQueryResult
}

const HOOKS_PUBLICOS: HookPublico[] = [
  {
    nome: 'useLayoutVersao',
    caminho: '/layout/versoes/99',
    useConsulta: () => useLayoutVersao('99'),
  },
  {
    nome: 'useCampoLayoutPorSlug',
    caminho: '/layout/campos/inexistente',
    useConsulta: () => useCampoLayoutPorSlug('inexistente'),
  },
  {
    nome: 'useProvedorPorSlug',
    caminho: '/provedores/inexistente',
    useConsulta: () => useProvedorPorSlug('inexistente'),
  },
  {
    nome: 'useVersaoProvedor',
    caminho: '/provedores/ipm/versoes/99',
    useConsulta: () => useVersaoProvedor('ipm', '99'),
  },
]

type RespostaDaApi = number | 'rede'

/**
 * Conta as requisições até a consulta desistir. Só a espera entre tentativas sai do caminho: a
 * decisão de retentar continua sendo a do próprio hook, e a contagem não depende de relógio.
 */
async function contarRequisicoes(hook: HookPublico, resposta: RespostaDaApi): Promise<number> {
  let requisicoes = 0
  server.use(
    http.get(`${API_URL}${hook.caminho}`, () => {
      requisicoes += 1
      if (resposta === 'rede') return HttpResponse.error()
      return HttpResponse.json(
        { error: { code: 'QUALQUER', message: 'Falhou.' } },
        { status: resposta },
      )
    }),
  )

  const queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  const envolver = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  const { result } = renderHook(hook.useConsulta, { wrapper: envolver })
  await waitFor(() => expect(result.current.isError).toBe(true))
  return requisicoes
}

describe.each(HOOKS_PUBLICOS)('retentativa de $nome', (hook) => {
  it('endereço inexistente (404) faz exatamente 1 requisição', async () => {
    expect(await contarRequisicoes(hook, 404)).toBe(1)
  })

  it.each([400, 403, 429])('um %i que o hook não classifica faz 1 requisição', async (status) => {
    expect(await contarRequisicoes(hook, status)).toBe(1)
  })

  it.each<RespostaDaApi>([503, 'rede'])(
    '%s é tentado de novo, 3 requisições no total',
    async (resposta) => {
      expect(await contarRequisicoes(hook, resposta)).toBe(3)
    },
  )
})
