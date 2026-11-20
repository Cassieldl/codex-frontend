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
import {
  EstadoArtigoIndisponivel,
  type VarianteArtigoIndisponivel,
} from './EstadoArtigoIndisponivel'

function renderComRouter(
  variante: VarianteArtigoIndisponivel,
  slugTentado: string,
  motivo?: string,
) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaArtigo = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pagina',
    component: () => (
      <EstadoArtigoIndisponivel variante={variante} slugTentado={slugTentado} motivo={motivo} />
    ),
  })
  const rotaBusca = createRoute({
    getParentRoute: () => rootRoute,
    path: '/busca',
    validateSearch: (search: Record<string, unknown>) => search,
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rotaArtigo, rotaBusca])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/pagina'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('EstadoArtigoIndisponivel', () => {
  it('404 diz que o artigo não existe e oferece busca pelo slug tentado', async () => {
    renderComRouter('nao-encontrado', 'artigo-que-nunca-existiu')

    expect(await screen.findByText('Este artigo não existe.')).toBeInTheDocument()
    expect(
      screen.getByText('Confira o endereço ou busque pelo assunto do artigo.'),
    ).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Buscar/ })
    expect(link.getAttribute('href')).toContain('q=artigo-que-nunca-existiu')
  })

  it('410 diz que o artigo saiu do ar — texto distinto do 404 (M7)', async () => {
    renderComRouter('despublicado', 'artigo-antigo', 'Este artigo não está mais publicado.')

    expect(await screen.findByText('Este artigo saiu do ar.')).toBeInTheDocument()
    expect(screen.getByText('Este artigo não está mais publicado.')).toBeInTheDocument()
    expect(
      screen.getByText('Busque pelo assunto para encontrar o conteúdo atual.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Este artigo não existe.')).not.toBeInTheDocument()
  })

  it('reservado-ausente diz que o conteúdo vem em breve e aponta a busca', async () => {
    renderComRouter('reservado-ausente', 'como-funciona')

    expect(await screen.findByText('Este conteúdo estará disponível em breve.')).toBeInTheDocument()
    expect(
      screen.getByText('Use a busca para encontrar erros, campos e provedores.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Este artigo não existe.')).not.toBeInTheDocument()
  })

  it('CTA do caso reservado vai para a busca SEM termo pré-preenchido', async () => {
    renderComRouter('reservado-ausente', 'como-funciona')

    const link = await screen.findByRole('link', { name: 'Ir para a busca' })
    // `/busca` exige `q` no schema, então o termo vai vazio — nunca o slug
    // reservado, que não significa nada para quem chegou pelo menu.
    const busca = new URL(link.getAttribute('href') ?? '', 'https://codex.local')
    expect(busca.pathname).toBe('/busca')
    expect(busca.searchParams.get('q')).toBe('')
    expect(link.getAttribute('href')).not.toContain('como-funciona')
    expect(screen.queryByRole('link', { name: /Buscar “como-funciona”/ })).not.toBeInTheDocument()
  })

  it('as três variantes têm títulos distintos entre si', async () => {
    const titulos: string[] = []

    for (const variante of [
      'nao-encontrado',
      'despublicado',
      'reservado-ausente',
    ] as VarianteArtigoIndisponivel[]) {
      const { unmount } = renderComRouter(variante, 'slug-qualquer')
      const titulo = await screen.findByRole('heading', { level: 1 })
      titulos.push(titulo.textContent ?? '')
      unmount()
    }

    expect(new Set(titulos).size).toBe(3)
  })
})
