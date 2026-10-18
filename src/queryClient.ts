import { QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

/** Mesmo número de retentativas do padrão do TanStack Query. */
const RETENTATIVAS_MAXIMAS = 3

/**
 * Rede caída e 5xx podem melhorar sozinhos; um 4xx não muda de resposta por insistência, e o
 * backoff segurava a tela em "Carregando" por uns 7 s antes de mostrar o erro.
 */
export function deveRetentarConsulta(falhasAteAgora: number, erro: unknown): boolean {
  if (falhasAteAgora >= RETENTATIVAS_MAXIMAS) return false

  const status = isAxiosError(erro) ? erro.response?.status : undefined
  return status === undefined || status < 400 || status >= 500
}

export function criarQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: deveRetentarConsulta },
    },
  })
}
