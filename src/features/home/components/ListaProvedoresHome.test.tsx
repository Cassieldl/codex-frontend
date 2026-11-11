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
  const routeTree = rootRoute.addChildren([rotaHome, rotaProvedor])
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

  it('cada provedor é um link só, para a página dele, sem coluna nem link de versão', async () => {
    renderLista([{ categoria: 'Proprio', total: 1, provedores: [ipm] }])

    expect(await screen.findByRole('link', { name: 'IPM Sistemas' })).toHaveAttribute(
      'href',
      '/provedores/ipm',
    )
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.queryByText('Última versão')).not.toBeInTheDocument()
    expect(screen.queryByText('2.04')).not.toBeInTheDocument()
    expect(screen.queryByText(/outras?/i)).not.toBeInTheDocument()
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
})

/**
 * O total da categoria ficava como número solto encostado na borda direita da linha divisória —
 * lia-se como artefato de layout, e um leitor de tela anunciava apenas "2".
 */
describe('ListaProvedoresHome — total da categoria', () => {
  it('acompanha a unidade, no plural', async () => {
    renderLista([{ categoria: 'Proprio', total: 2, provedores: [ipm] }])

    expect(await screen.findByText('2 provedores')).toBeInTheDocument()
  })

  it('concorda no singular', async () => {
    renderLista([{ categoria: 'Nacional', total: 1, provedores: [nacional] }])

    expect(await screen.findByText('1 provedor')).toBeInTheDocument()
  })
})

/**
 * A data aqui é dado de coluna, comparado linha a linha, e os artboards a escrevem numérica —
 * por extenso é o formato do selo de verificação em destaque, não o da tabela.
 *
 * O `12/08` importa tanto quanto o formato: `new Date('2026-08-12')` é lido como meia-noite UTC e
 * renderizava **11/08** em qualquer fuso a oeste de Greenwich, que é o de todo usuário do Codex.
 */
describe('ListaProvedoresHome — data de verificação', () => {
  it('escreve a data numérica, sem deslocar o dia', async () => {
    renderLista([{ categoria: 'Proprio', total: 1, provedores: [ipm] }])

    expect(await screen.findByText('Verificado em 12/08/2026')).toBeInTheDocument()
  })
})

// jsdom não faz layout: a medida em 390 px fica com o navegador. Aqui se trava a regra que a
// produz, porque o nome que encolhe antes de a linha quebrar vira "Emiss..." no celular.
describe('ListaProvedoresHome: nome do provedor no celular', () => {
  it('ocupa a linha inteira abaixo de sm e só trunca a partir de sm', async () => {
    const emissorNacional: ProvedorHomeDto = {
      ...nacional,
      slug: 'emissor-nacional',
      nome: 'Emissor Nacional',
    }
    renderLista([{ categoria: 'Nacional', total: 1, provedores: [emissorNacional] }])

    const nome = await screen.findByRole('link', { name: 'Emissor Nacional' })
    const classes = nome.className.split(/\s+/)

    expect(classes).toContain('basis-full')
    expect(classes).not.toContain('truncate')
    expect(classes).not.toContain('flex-1')
    expect(classes).toContain('sm:truncate')
  })
})
