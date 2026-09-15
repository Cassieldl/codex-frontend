import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ErroSemVersaoAplicavel, type ErroSemVersaoAplicavelProps } from './ErroSemVersaoAplicavel'

// Com versões aplicáveis, cada item vira `<Link>` do TanStack Router —
// precisa de um `RouterProvider` de verdade (mesmo padrão de `erros-index.test.tsx`).
function renderComRouter(props: ErroSemVersaoAplicavelProps) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pagina',
    component: () => <ErroSemVersaoAplicavel {...props} />,
  })
  const routeTree = rootRoute.addChildren([rota])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/pagina'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('ErroSemVersaoAplicavel', () => {
  it('sem versões aplicáveis, renderiza o texto de erro geral — nunca lista vazia nem "Aplicável a: —"', () => {
    render(<ErroSemVersaoAplicavel versoesAplicaveis={[]} />)

    expect(
      screen.getByText(
        'Este erro é geral — não depende de um provedor específico, vale para qualquer integração.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
    expect(screen.queryByText(/Aplicável a/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Provedores e versões aplicáveis')).not.toBeInTheDocument()
  })

  it('com versões aplicáveis, renderiza a lista normal com links para a versão do provedor', async () => {
    renderComRouter({
      versoesAplicaveis: [
        {
          provedorSlug: 'ipm-sistemas',
          provedorNome: 'IPM Sistemas',
          versaoSlug: '2-04',
          versaoRotulo: '2.04',
        },
        {
          provedorSlug: 'betha-sistemas',
          provedorNome: 'Betha Sistemas',
          versaoSlug: '3-01',
          versaoRotulo: '3.01',
        },
      ],
    })

    // `Link` só monta depois que o `RouterProvider` resolve o match inicial
    // (assíncrono) — condição observável, nunca contagem de ticks (AP-FRONTEND-016).
    expect(await screen.findByText('Provedores e versões aplicáveis')).toBeInTheDocument()

    const linkIpm = screen.getByRole('link', { name: 'IPM Sistemas · 2.04' })
    expect(linkIpm).toHaveAttribute('href', '/provedores/ipm-sistemas/2-04')

    const linkBetha = screen.getByRole('link', { name: 'Betha Sistemas · 3.01' })
    expect(linkBetha).toHaveAttribute('href', '/provedores/betha-sistemas/3-01')
  })
})
