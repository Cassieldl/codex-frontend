import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { routeTree } from '../../routeTree.gen'

// A página de /provedores mora no próprio arquivo de rota, que só carrega sob demanda: o
// `router.load()` resolve o chunk antes do render, e a árvore usada é a real.
const TIMEOUT_CARGA_DA_ARVORE_REAL_MS = 60_000

describe('/provedores', () => {
  it(
    'nomeia a aba "Provedores | Codex"',
    async () => {
      const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/provedores'] }),
      })
      await router.load()

      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      )

      await screen.findByRole('heading', { level: 1, name: 'Provedores' })
      await waitFor(() => expect(document.title).toBe('Provedores | Codex'))
    },
    TIMEOUT_CARGA_DA_ARVORE_REAL_MS,
  )
})
