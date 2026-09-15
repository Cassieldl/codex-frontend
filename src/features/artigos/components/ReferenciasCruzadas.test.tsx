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
import type { ReferenciaCampoLayout, ReferenciaErro } from '../types/artigo'
import { ReferenciasCruzadas } from './ReferenciasCruzadas'

const campoSemUrl: ReferenciaCampoLayout = {
  rotulo: 'CAMPO DO LAYOUT',
  slug: 'cnpj-tomador',
  nome: 'CNPJ do tomador',
  caminhoXml: 'Rps/Tomador/CpfCnpj/Cnpj',
  url: null,
}

const erro: ReferenciaErro = {
  rotulo: 'REJEIÇÃO',
  slug: 'e0117-cnpj-tomador-invalido',
  codigo: 'E0117',
  titulo: 'CNPJ do tomador inválido',
  url: '/erros/e0117-cnpj-tomador-invalido',
}

function renderComRouter(elemento: React.ReactNode) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaArtigo = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pagina',
    component: () => <>{elemento}</>,
  })
  const rotaErro = createRoute({
    getParentRoute: () => rootRoute,
    path: '/erros/$erroSlug',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rotaArtigo, rotaErro])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/pagina'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('ReferenciasCruzadas', () => {
  it('campo de layout com url null vira texto — nunca link morto (PQ-06)', async () => {
    renderComRouter(<ReferenciasCruzadas camposLayout={[campoSemUrl]} erros={[]} />)

    expect(await screen.findByText('CNPJ do tomador')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'CNPJ do tomador' })).not.toBeInTheDocument()
    expect(screen.getByText('Rps/Tomador/CpfCnpj/Cnpj')).toBeInTheDocument()
  })

  it('campo de layout com url preenchida (fatia 003) vira link, sem mudar o componente', async () => {
    renderComRouter(
      <ReferenciasCruzadas
        camposLayout={[{ ...campoSemUrl, url: '/layout-invoicy/cnpj-tomador' }]}
        erros={[]}
      />,
    )

    const link = await screen.findByRole('link', { name: 'CNPJ do tomador' })
    expect(link).toHaveAttribute('href', '/layout-invoicy/cnpj-tomador')
  })

  it('rejeição relacionada vira link para a página do erro', async () => {
    renderComRouter(<ReferenciasCruzadas camposLayout={[]} erros={[erro]} />)

    const link = await screen.findByRole('link', { name: /E0117 — CNPJ do tomador inválido/ })
    expect(link).toHaveAttribute('href', '/erros/e0117-cnpj-tomador-invalido')
  })

  it('mostra o rótulo literal do contrato em cada item, com acento preservado', async () => {
    renderComRouter(<ReferenciasCruzadas camposLayout={[campoSemUrl]} erros={[erro]} />)

    expect(await screen.findByText('CAMPO DO LAYOUT')).toBeInTheDocument()
    expect(screen.getByText('REJEIÇÃO')).toBeInTheDocument()
  })

  it('seção vazia não renderiza <h2> órfão', async () => {
    renderComRouter(<ReferenciasCruzadas camposLayout={[campoSemUrl]} erros={[]} />)

    expect(
      await screen.findByRole('heading', { name: 'Campos do Layout InvoiCy' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Rejeições relacionadas' }),
    ).not.toBeInTheDocument()
  })

  it('sem nenhuma referência, não renderiza nada', () => {
    const { container } = renderComRouter(<ReferenciasCruzadas camposLayout={[]} erros={[]} />)

    expect(container.querySelectorAll('h2')).toHaveLength(0)
    expect(container.querySelectorAll('section')).toHaveLength(0)
  })
})

describe('ReferenciasCruzadas — url do campo de layout é saneada (ACH-01)', () => {
  const CAMPO_BASE = {
    rotulo: 'CAMPO DO LAYOUT' as const,
    slug: 'razao-social',
    nome: 'cRazaoSocial',
    caminhoXml: '/nfe/emit/cRazaoSocial',
  }

  // `url` é sempre nulo nesta fatia (PQ-06), então o branch do link é código agendado para a
  // 003 — e é exatamente o tipo de branch em que o saneador é esquecido, porque ninguém
  // consegue reproduzi-lo hoje. A auditoria de segurança e o QA acharam o mesmo ponto.
  it.each([
    ['https://evil.com', 'endereço externo'],
    ['//evil.com', 'protocolo-relativo, que resolve para outro host'],
    ['javascript:alert(1)', 'esquema executável'],
  ])('não vira link quando a API manda %s (%s)', (url) => {
    render(<ReferenciasCruzadas camposLayout={[{ ...CAMPO_BASE, url }]} erros={[]} />)

    expect(screen.queryByRole('link', { name: CAMPO_BASE.nome })).not.toBeInTheDocument()
    expect(screen.getByText(CAMPO_BASE.nome)).toBeInTheDocument()
  })

  it('vira link quando a API manda um caminho interno', () => {
    render(
      <ReferenciasCruzadas
        camposLayout={[{ ...CAMPO_BASE, url: '/provedores/sefaz-sp/v4-00' }]}
        erros={[]}
      />,
    )

    expect(screen.getByRole('link', { name: CAMPO_BASE.nome })).toHaveAttribute(
      'href',
      '/provedores/sefaz-sp/v4-00',
    )
  })
})
