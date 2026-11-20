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
import { EstadoErroIndisponivel, type EstadoErroIndisponivelProps } from './EstadoErroIndisponivel'

// O caminho de recuperação usa `<Link>` do TanStack Router (Achado #2,
// residual fechado nesta passada) — precisa de um `RouterProvider` de
// verdade, mesmo padrão de `erros-index.test.tsx`/`RodapeContextual.test.tsx`.
// O `RouterProvider` resolve o match inicial de forma assíncrona — por isso
// as asserções usam `findBy*`/`await`, condição observável em vez de
// contagem de ticks (AP-FRONTEND-016).
function renderComRouter(props: EstadoErroIndisponivelProps) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaErro = createRoute({
    getParentRoute: () => rootRoute,
    path: '/erros/$erroSlug',
    component: () => <EstadoErroIndisponivel {...props} />,
  })
  const rotaBusca = createRoute({ getParentRoute: () => rootRoute, path: '/busca' })
  const routeTree = rootRoute.addChildren([rotaErro, rotaBusca])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/erros/e0117'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('EstadoErroIndisponivel', () => {
  it('404 (nao-encontrado) renderiza "Este erro não existe."', async () => {
    renderComRouter({ variante: 'nao-encontrado', slugTentado: 'e0117' })

    expect(
      await screen.findByRole('heading', { name: 'Este erro não existe.' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Confira o endereço ou busque pelo código do erro.'),
    ).toBeInTheDocument()
  })

  it('410 (despublicado) renderiza "Este erro saiu do ar." — nunca o texto do 404 (M7)', async () => {
    renderComRouter({ variante: 'despublicado', slugTentado: 'e0117' })

    expect(
      await screen.findByRole('heading', { name: 'Este erro saiu do ar.' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Este erro não existe.')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Confira o endereço ou busque pelo código do erro.'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('Busque pelo código do erro para ver o conteúdo atual.'),
    ).toBeInTheDocument()
  })

  it('404 e 410 nunca renderizam o mesmo título — telas distintas para o leitor', async () => {
    const { unmount } = renderComRouter({ variante: 'nao-encontrado', slugTentado: 'e0117' })
    const tituloNaoEncontrado = (await screen.findByRole('heading')).textContent
    unmount()

    renderComRouter({ variante: 'despublicado', slugTentado: 'e0117' })
    const tituloDespublicado = (await screen.findByRole('heading')).textContent

    expect(tituloNaoEncontrado).not.toBe(tituloDespublicado)
  })

  it('410 exibe o motivo devolvido pela API, quando houver', async () => {
    renderComRouter({
      variante: 'despublicado',
      slugTentado: 'e0117',
      motivo: 'Substituído pelo erro E0201 em 2026-01-15.',
    })

    expect(
      await screen.findByText('Substituído pelo erro E0201 em 2026-01-15.'),
    ).toBeInTheDocument()
  })

  it('404 e 410 sempre oferecem o caminho de recuperação pela busca, pré-preenchido com o slug, via navegação client-side', async () => {
    const { unmount } = renderComRouter({
      variante: 'nao-encontrado',
      slugTentado: 'e0117-teste',
    })
    const linkNaoEncontrado = await screen.findByRole('link', { name: 'Buscar “e0117-teste”' })
    expect(linkNaoEncontrado).toHaveAttribute('href', '/busca?q=e0117-teste')
    unmount()

    renderComRouter({ variante: 'despublicado', slugTentado: 'e0117-teste' })
    const linkDespublicado = await screen.findByRole('link', { name: 'Buscar “e0117-teste”' })
    expect(linkDespublicado).toHaveAttribute('href', '/busca?q=e0117-teste')
  })
})
