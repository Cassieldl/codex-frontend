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
import { CamposRelacionados, type CamposRelacionadosProps } from './CamposRelacionados'

const campos = [
  { campoLayoutSlug: 'cnpj-tomador', nome: 'CNPJ do tomador' },
  { campoLayoutSlug: 'cep-tomador', nome: 'CEP do tomador' },
]

// Com contexto, cada campo vira `<Link>` do TanStack Router — precisa de um
// `RouterProvider` de verdade (mesmo padrão de `erros-index.test.tsx`).
function renderComRouter(props: CamposRelacionadosProps) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pagina',
    component: () => <CamposRelacionados {...props} />,
  })
  const routeTree = rootRoute.addChildren([rota])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/pagina'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('CamposRelacionados', () => {
  it('com contexto de provedor/versão, cada campo vira link para a âncora dentro da versão (M10)', async () => {
    renderComRouter({
      campos,
      contexto: { provedorSlug: 'ipm-sistemas', versaoSlug: '2-04' },
    })

    // `Link` só monta depois que o `RouterProvider` resolve o match inicial
    // (assíncrono) — condição observável, nunca contagem de ticks (AP-FRONTEND-016).
    const link = await screen.findByRole('link', { name: 'CNPJ do tomador' })
    expect(link).toHaveAttribute('href', '/provedores/ipm-sistemas/2-04#campo-cnpj-tomador')
  })

  it('sem contexto, cada campo é texto simples — nunca link (M10)', () => {
    render(<CamposRelacionados campos={campos} contexto={null} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('CNPJ do tomador')).toBeInTheDocument()
    expect(screen.getByText('CEP do tomador')).toBeInTheDocument()
  })

  it('não renderiza a seção quando não há campos relacionados', () => {
    const { container } = render(<CamposRelacionados campos={[]} contexto={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
