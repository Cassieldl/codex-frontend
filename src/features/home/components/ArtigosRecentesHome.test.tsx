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
import type { ArtigoListaItem } from '../../artigos/types/artigo'
import type { ArtigoRecenteHome } from '../types/home'
import { ArtigosRecentesHome } from './ArtigosRecentesHome'

const artigos: ArtigoRecenteHome[] = [
  {
    slug: 'identificar-a-versao-pelo-retorno',
    tipo: 'Procedimento',
    titulo: 'Identificar a versão pelo retorno',
    resumo: 'Como descobrir qual versão o município usa.',
    verificadoEm: '2026-08-14',
  },
  {
    slug: 'campo-ausente-nao-se-aplica',
    tipo: 'Conceito',
    titulo: 'Campo ausente quer dizer “não se aplica”',
    resumo: null,
    verificadoEm: null,
  },
]

function renderArtigos(itens: ArtigoRecenteHome[]) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaHome = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <ArtigosRecentesHome artigos={itens} />,
  })
  const rotaIndice = createRoute({
    getParentRoute: () => rootRoute,
    path: '/artigos',
    validateSearch: (search: Record<string, unknown>) => search,
    component: () => null,
  })
  const rotaArtigo = createRoute({
    getParentRoute: () => rootRoute,
    path: '/artigos/$artigoSlug',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rotaHome, rotaIndice, rotaArtigo])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('ArtigosRecentesHome', () => {
  it('ArtigoRecenteHome é aceito onde ArtigoListaItem é esperado', () => {
    // Trava de compatibilidade: `CardArtigo` é reusado do índice de artigos, e
    // só continua reusável enquanto os dois shapes forem o mesmo. Se P9 e P7
    // divergirem num campo, esta atribuição para de compilar — que é o ponto.
    const comoItemDeLista: ArtigoListaItem = artigos[0]

    expect(comoItemDeLista.slug).toBe('identificar-a-versao-pelo-retorno')
  })

  it('renderiza um card por artigo, com link para a página do artigo', async () => {
    renderArtigos(artigos)

    expect(
      await screen.findByRole('link', { name: 'Identificar a versão pelo retorno' }),
    ).toHaveAttribute('href', '/artigos/identificar-a-versao-pelo-retorno')
    expect(
      screen.getByRole('link', { name: 'Campo ausente quer dizer “não se aplica”' }),
    ).toBeInTheDocument()
  })

  it('sem artigo nenhum, some o card mas fica o caminho para o índice', async () => {
    renderArtigos([])

    expect(await screen.findByRole('heading', { name: 'Artigos' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver o índice completo' })).toHaveAttribute(
      'href',
      '/artigos?pagina=1',
    )
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
})
