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
import type { CategoriaProvedoresHome, ProvedorHomeDto } from '../types/home'
import { ListaProvedoresHome } from './ListaProvedoresHome'

const ipm: ProvedorHomeDto = {
  slug: 'ipm',
  nome: 'IPM Sistemas',
  versoes: [
    { slug: '2-04', rotulo: '2.04' },
    { slug: '2-03', rotulo: '2.03' },
  ],
  verificadoEm: '2026-08-12',
  temComunicado: false,
}

const nacional: ProvedorHomeDto = {
  slug: 'nacional-adn',
  nome: 'Nacional/ADN',
  versoes: [{ slug: '1-01', rotulo: '1.01' }],
  verificadoEm: null,
  temComunicado: true,
}

function renderLista(categorias: CategoriaProvedoresHome[]) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaHome = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <ListaProvedoresHome categorias={categorias} />,
  })
  const rotaProvedor = createRoute({
    getParentRoute: () => rootRoute,
    path: '/provedores/$provedorSlug',
    component: () => null,
  })
  const rotaVersao = createRoute({
    getParentRoute: () => rootRoute,
    path: '/provedores/$provedorSlug/$versaoSlug',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rotaHome, rotaProvedor, rotaVersao])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('ListaProvedoresHome', () => {
  it('agrupa por categoria com o rótulo em português e o total do contrato', async () => {
    renderLista([
      { categoria: 'Proprio', total: 1, provedores: [ipm] },
      { categoria: 'Nacional', total: 1, provedores: [nacional] },
    ])

    expect(await screen.findByRole('heading', { name: 'Próprio' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nacional' })).toBeInTheDocument()
  })

  it('a coluna é "Última versão", não "Vigente" — versão de provedor não tem vigência', async () => {
    renderLista([{ categoria: 'Proprio', total: 1, provedores: [ipm] }])

    expect(await screen.findByText('Última versão')).toBeInTheDocument()
    expect(screen.queryByText('Vigente')).not.toBeInTheDocument()
  })

  it('liga a versão mais recente e manda as demais para a página do provedor', async () => {
    renderLista([{ categoria: 'Proprio', total: 1, provedores: [ipm] }])

    expect(await screen.findByRole('link', { name: '2.04' })).toHaveAttribute(
      'href',
      '/provedores/ipm/2-04',
    )
    expect(screen.getByRole('link', { name: '+1 outra' })).toHaveAttribute(
      'href',
      '/provedores/ipm',
    )
  })

  it('não oferece "outras" quando o provedor só tem uma versão', async () => {
    renderLista([{ categoria: 'Nacional', total: 1, provedores: [nacional] }])

    expect(await screen.findByRole('link', { name: '1.01' })).toBeInTheDocument()
    expect(screen.queryByText(/outra/)).not.toBeInTheDocument()
  })

  it('marca comunicado com ícone rotulado — nunca só por cor, e só em quem tem', async () => {
    renderLista([
      { categoria: 'Nacional', total: 1, provedores: [nacional] },
      { categoria: 'Proprio', total: 1, provedores: [ipm] },
    ])

    expect(
      await screen.findByRole('img', { name: 'Comunicado ativo para Nacional/ADN' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: 'Comunicado ativo para IPM Sistemas' }),
    ).not.toBeInTheDocument()
  })

  it('diz "Ainda não verificado" em vez de inventar data quando não houve verificação', async () => {
    renderLista([
      { categoria: 'Nacional', total: 1, provedores: [nacional] },
      { categoria: 'Proprio', total: 1, provedores: [ipm] },
    ])

    expect(await screen.findByText('Ainda não verificado')).toBeInTheDocument()
    expect(screen.getByText('Verificado em 12/08/2026')).toBeInTheDocument()
  })

  it('provedor publicado sem versão nenhuma não ganha chip de versão', async () => {
    renderLista([
      {
        categoria: 'Proprio',
        total: 1,
        provedores: [{ ...ipm, versoes: [], nome: 'Prefeitura de Exemplo' }],
      },
    ])

    expect(await screen.findByText('Nenhuma publicada')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '2.04' })).not.toBeInTheDocument()
  })
})
