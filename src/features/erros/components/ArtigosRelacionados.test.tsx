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
import type { ReferenciaArtigo } from '../types/erro'
import { ArtigosRelacionados } from './ArtigosRelacionados'

const artigos: ReferenciaArtigo[] = [
  {
    rotulo: 'ARTIGO',
    slug: 'campo-ausente-nao-se-aplica',
    tipo: 'Conceito',
    titulo: 'Campo ausente quer dizer “não se aplica”',
    url: '/artigos/campo-ausente-nao-se-aplica',
  },
  {
    rotulo: 'ARTIGO',
    slug: 'identificar-a-versao-pelo-retorno',
    tipo: 'Procedimento',
    titulo: 'Identificar a versão pelo retorno',
    url: '/artigos/identificar-a-versao-pelo-retorno',
  },
]

// O RouterProvider monta de forma assíncrona: sem esperar a âncora, a ausência seria afirmada no vazio.
const ANCORA_DE_MONTAGEM = 'rota do erro montada'

function renderBloco(lista: ReferenciaArtigo[]) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaErro = createRoute({
    getParentRoute: () => rootRoute,
    path: '/erros/e0117',
    component: () => (
      <>
        <p>{ANCORA_DE_MONTAGEM}</p>
        <ArtigosRelacionados artigos={lista} />
      </>
    ),
  })
  const rotaArtigo = createRoute({
    getParentRoute: () => rootRoute,
    path: '/artigos/$artigoSlug',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rotaErro, rotaArtigo])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/erros/e0117'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('ArtigosRelacionados', () => {
  it('lista cada artigo com selo, tipo e link para a url que o backend entregou', async () => {
    renderBloco(artigos)

    const link = await screen.findByRole('link', {
      name: 'Campo ausente quer dizer “não se aplica”',
    })
    expect(link).toHaveAttribute('href', '/artigos/campo-ausente-nao-se-aplica')
    expect(screen.getAllByText('ARTIGO')).toHaveLength(2)
    expect(screen.getByText('Conceito')).toBeInTheDocument()
    expect(screen.getByText('Procedimento')).toBeInTheDocument()
  })

  it('coleção vazia não renderiza a seção nem o título órfão', async () => {
    const { container } = renderBloco([])

    expect(await screen.findByText(ANCORA_DE_MONTAGEM)).toBeInTheDocument()

    expect(screen.queryByRole('heading', { name: 'Artigos relacionados' })).not.toBeInTheDocument()
    expect(container.querySelectorAll('section')).toHaveLength(0)
  })

  it('url fora do domínio interno vira texto, nunca link (BAIXO-02)', async () => {
    renderBloco([
      {
        rotulo: 'ARTIGO',
        slug: 'externo',
        tipo: 'Conceito',
        titulo: 'Artigo com url externa',
        url: 'https://exemplo.invalido/phishing',
      },
    ])

    expect(await screen.findByText('Artigo com url externa')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Artigo com url externa' })).not.toBeInTheDocument()
  })
})
