import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { createEvent, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AbasNavegaveis, type AbaNavegavel } from './AbasNavegaveis'

function renderComRouter(abas: AbaNavegavel[], caminhoInicial: string) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaVersaoA = createRoute({
    getParentRoute: () => rootRoute,
    path: '/versao-a',
    component: () => <AbasNavegaveis abas={abas} ariaLabel="Versões" />,
  })
  const rotaVersaoB = createRoute({
    getParentRoute: () => rootRoute,
    path: '/versao-b',
    component: () => <AbasNavegaveis abas={abas} ariaLabel="Versões" />,
  })
  // Rota "base" (ex.: /provedor sem versão escolhida, M25) — não bate com
  // nenhuma das abas, cenário real de "nenhuma versão selecionada".
  const rotaSemVersao = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sem-versao-selecionada',
    component: () => <AbasNavegaveis abas={abas} ariaLabel="Versões" />,
  })
  const routeTree = rootRoute.addChildren([rotaVersaoA, rotaVersaoB, rotaSemVersao])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [caminhoInicial] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('AbasNavegaveis', () => {
  it('cada aba é um <a href> real do TanStack Router', async () => {
    renderComRouter(
      [
        { rotulo: 'Versão A', to: '/versao-a', ativa: true },
        { rotulo: 'Versão B', to: '/versao-b', ativa: false },
      ],
      '/versao-a',
    )

    const linkA = await screen.findByRole('link', { name: 'Versão A' })
    const linkB = screen.getByRole('link', { name: 'Versão B' })

    expect(linkA).toHaveAttribute('href', '/versao-a')
    expect(linkB).toHaveAttribute('href', '/versao-b')
  })

  it('aria-current="page" só na aba cujo `to` bate com a rota atual', async () => {
    renderComRouter(
      [
        { rotulo: 'Versão A', to: '/versao-a', ativa: true },
        { rotulo: 'Versão B', to: '/versao-b', ativa: false },
      ],
      '/versao-a',
    )

    const linkA = await screen.findByRole('link', { name: 'Versão A' })
    const linkB = screen.getByRole('link', { name: 'Versão B' })

    expect(linkA).toHaveAttribute('aria-current', 'page')
    expect(linkB).not.toHaveAttribute('aria-current')
  })

  it('nenhuma aba tem aria-current quando nenhuma versão está selecionada', async () => {
    renderComRouter(
      [
        { rotulo: 'Versão A', to: '/versao-a', ativa: false },
        { rotulo: 'Versão B', to: '/versao-b', ativa: false },
      ],
      '/sem-versao-selecionada',
    )

    const links = await screen.findAllByRole('link')
    for (const link of links) {
      expect(link).not.toHaveAttribute('aria-current')
    }
  })

  it('clique com modificador (ctrl) não faz preventDefault — mantém "abrir em nova aba"', async () => {
    renderComRouter(
      [
        { rotulo: 'Versão A', to: '/versao-a', ativa: true },
        { rotulo: 'Versão B', to: '/versao-b', ativa: false },
      ],
      '/versao-a',
    )

    const linkB = await screen.findByRole('link', { name: 'Versão B' })
    const evento = createEvent.click(linkB, { ctrlKey: true })
    const naoFoiCancelado = fireEvent(linkB, evento)

    expect(naoFoiCancelado).toBe(true)
  })

  // §2.1 — abas do índice de artigos são filtro por URL (mesma rota, `search`
  // diferente), não rota com parâmetro de caminho. O aditivo é opcional: sem
  // `search`, o href continua sendo exatamente o de antes.
  it('serializa `search` no href da aba, mantendo o href limpo quando não há search', async () => {
    const rootRoute = createRootRoute({ component: Outlet })
    const rotaArtigos = createRoute({
      getParentRoute: () => rootRoute,
      path: '/artigos',
      validateSearch: (search: Record<string, unknown>) => search,
      component: () => (
        <AbasNavegaveis
          abas={[
            { rotulo: 'Todos', to: '/artigos', search: { pagina: 1 }, ativa: true },
            {
              rotulo: 'Conceito',
              to: '/artigos',
              search: { tipo: 'Conceito', pagina: 1 },
              ativa: false,
            },
            { rotulo: 'Sem search', to: '/artigos', ativa: false },
          ]}
          ariaLabel="Tipos de artigo"
        />
      ),
    })
    const routeTree = rootRoute.addChildren([rotaArtigos])
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/artigos'] }),
    })

    render(<RouterProvider router={router} />)

    const abaConceito = await screen.findByRole('link', { name: 'Conceito' })
    const abaTodos = screen.getByRole('link', { name: 'Todos' })
    const abaSemSearch = screen.getByRole('link', { name: 'Sem search' })

    expect(abaConceito.getAttribute('href')).toContain('tipo=Conceito')
    expect(abaTodos.getAttribute('href')).not.toContain('tipo=')
    expect(abaSemSearch).toHaveAttribute('href', '/artigos')
  })

  it('só a aba marcada como ativa tem aria-current, mesmo quando outra é subconjunto da URL', async () => {
    // "Todos" (`{ pagina }`) é subconjunto de `{ tipo, pagina }`: sem
    // `activeOptions.exact`, o próprio `<Link>` marcaria as duas como
    // current e o leitor de tela anunciaria duas abas atuais.
    const rootRoute = createRootRoute({ component: Outlet })
    const rotaArtigos = createRoute({
      getParentRoute: () => rootRoute,
      path: '/artigos',
      validateSearch: (search: Record<string, unknown>) => search,
      component: () => (
        <AbasNavegaveis
          abas={[
            { rotulo: 'Todos', to: '/artigos', search: { pagina: 1 }, ativa: false },
            {
              rotulo: 'Conceito',
              to: '/artigos',
              search: { tipo: 'Conceito', pagina: 1 },
              ativa: true,
            },
          ]}
          ariaLabel="Tipos de artigo"
        />
      ),
    })
    const routeTree = rootRoute.addChildren([rotaArtigos])
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/artigos?tipo=Conceito&pagina=1'] }),
    })

    render(<RouterProvider router={router} />)

    const abaConceito = await screen.findByRole('link', { name: 'Conceito' })
    const abaTodos = screen.getByRole('link', { name: 'Todos' })

    expect(abaConceito).toHaveAttribute('aria-current', 'page')
    expect(abaTodos).not.toHaveAttribute('aria-current')
  })

  it('abas com o mesmo `to` e `search` diferente coexistem — nenhuma some por chave repetida', async () => {
    const rootRoute = createRootRoute({ component: Outlet })
    const rotaArtigos = createRoute({
      getParentRoute: () => rootRoute,
      path: '/artigos',
      validateSearch: (search: Record<string, unknown>) => search,
      component: () => (
        <AbasNavegaveis
          abas={[
            { rotulo: 'Conceito', to: '/artigos', search: { tipo: 'Conceito' }, ativa: false },
            {
              rotulo: 'Procedimento',
              to: '/artigos',
              search: { tipo: 'Procedimento' },
              ativa: false,
            },
            {
              rotulo: 'Mudança/Migração',
              to: '/artigos',
              search: { tipo: 'Mudanca' },
              ativa: true,
            },
          ]}
          ariaLabel="Tipos de artigo"
        />
      ),
    })
    const routeTree = rootRoute.addChildren([rotaArtigos])
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/artigos'] }),
    })

    render(<RouterProvider router={router} />)

    const links = await screen.findAllByRole('link')
    expect(links).toHaveLength(3)
    expect(links.map((link) => link.textContent)).toEqual([
      'Conceito',
      'Procedimento',
      'Mudança/Migração',
    ])
  })

  // Abas que navegam por parâmetro de caminho. Cobre a montagem do
  // href a partir de `params` (medido: zerar `params` no componente derruba só este
  // teste). NÃO é detector do `activeOptions={{ exact: true }}`: com params as URLs
  // já diferem, então o casamento exato ou parcial dá o mesmo resultado — quem
  // protege aquilo é o caso do subconjunto de search, acima.
  it('marca a aba certa também quando a navegação é por parâmetro de caminho', async () => {
    const rootRoute = createRootRoute({ component: Outlet })
    const rotaVersao = createRoute({
      getParentRoute: () => rootRoute,
      path: '/catalogo/$grupoSlug/$itemSlug',
      component: () => (
        <AbasNavegaveis
          abas={[
            {
              rotulo: 'Versão 4.00',
              to: '/catalogo/$grupoSlug/$itemSlug',
              params: { grupoSlug: 'sefaz-sp', itemSlug: 'v4-00' },
              ativa: true,
            },
            {
              rotulo: 'Versão 3.10',
              to: '/catalogo/$grupoSlug/$itemSlug',
              params: { grupoSlug: 'sefaz-sp', itemSlug: 'v3-10' },
              ativa: false,
            },
          ]}
          ariaLabel="Versões"
        />
      ),
    })
    const routeTree = rootRoute.addChildren([rotaVersao])
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/catalogo/sefaz-sp/v4-00'] }),
    })

    render(<RouterProvider router={router} />)

    const atual = await screen.findByRole('link', { name: 'Versão 4.00' })
    const outra = screen.getByRole('link', { name: 'Versão 3.10' })

    expect(atual).toHaveAttribute('href', '/catalogo/sefaz-sp/v4-00')
    expect(atual).toHaveAttribute('aria-current', 'page')
    expect(outra).toHaveAttribute('href', '/catalogo/sefaz-sp/v3-10')
    expect(outra).not.toHaveAttribute('aria-current')
  })
})
