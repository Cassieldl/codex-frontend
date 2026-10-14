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
  {
    slug: 'cnpj-tomador',
    nome: 'CNPJ do tomador',
    caminhoXml: '//Tomador/TomaCNPJ',
    ancoras: [{ provedorSlug: 'ipm-sistemas', versaoSlug: '2-04' }],
  },
  {
    slug: 'cep-tomador',
    nome: 'CEP do tomador',
    caminhoXml: '//Tomador/TomaCEP',
    ancoras: [{ provedorSlug: 'ipm-sistemas', versaoSlug: '2-04' }],
  },
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

  it('sem contexto, cada campo vira link para a resolução pública do campo no layout', async () => {
    renderComRouter({ campos, contexto: null })

    const cnpj = await screen.findByRole('link', { name: 'CNPJ do tomador' })
    expect(cnpj).toHaveAttribute('href', '/layout/campos/cnpj-tomador')
    expect(screen.getByRole('link', { name: 'CEP do tomador' })).toHaveAttribute(
      'href',
      '/layout/campos/cep-tomador',
    )
  })

  // O slug vem da API: o caminho é montado por parâmetro tipado, que codifica o que não é segmento.
  it('sem contexto, slug com caracteres de caminho não escapa do segmento', async () => {
    renderComRouter({
      campos: [{ ...campos[0]!, slug: 'a/../b?x=1#y', nome: 'Slug estranho' }],
      contexto: null,
    })

    const href = (await screen.findByRole('link', { name: 'Slug estranho' })).getAttribute('href')
    expect(href).toMatch(/^\/layout\/campos\/[^/?#]+$/)
  })

  it('não renderiza a seção quando não há campos relacionados', () => {
    const { container } = render(<CamposRelacionados campos={[]} contexto={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
