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
import type { VersaoProvedorResumo } from '../types/provedor'
import { ProvedorIndexConteudo } from './provedor-index'

function renderComRouter(versoes: VersaoProvedorResumo[]) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaIndex = createRoute({
    getParentRoute: () => rootRoute,
    path: '/provedores/$provedorSlug/',
    component: () => (
      <ProvedorIndexConteudo
        provedorSlug="prefeitura-exemplo"
        provedorNome="Prefeitura Exemplo"
        versoes={versoes}
      />
    ),
  })
  // Rota alvo dos links de versão — só precisa existir para o `<Link>` resolver o `href`.
  const rotaVersao = createRoute({
    getParentRoute: () => rootRoute,
    path: '/provedores/$provedorSlug/$versaoSlug',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rotaIndex, rotaVersao])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/provedores/prefeitura-exemplo/'] }),
  })

  return render(<RouterProvider router={router} />)
}

const umaVersao: VersaoProvedorResumo[] = [
  {
    slug: 'v1',
    rotulo: 'Versão 1',
    verificadoEm: '2026-07-01T00:00:00Z',
    url: '/provedores/prefeitura-exemplo/v1',
  },
]

const duasVersoes: VersaoProvedorResumo[] = [
  ...umaVersao,
  {
    slug: 'v2',
    rotulo: 'Versão 2',
    verificadoEm: '2026-08-01T00:00:00Z',
    url: '/provedores/prefeitura-exemplo/v2',
  },
]

describe('ProvedorIndexConteudo (rota /provedores/{slug}, sem aba escolhida)', () => {
  it('com 1 versão só, ainda mostra a escolha de versão — nunca navega sozinho (M25)', async () => {
    renderComRouter(umaVersao)

    expect(
      await screen.findByRole('heading', {
        name: 'Escolha uma versão para ver os campos, avisos e erros conhecidos',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Versão 1/ })).toBeInTheDocument()
  })

  it('com N versões, lista todas', async () => {
    renderComRouter(duasVersoes)

    expect(await screen.findByRole('link', { name: /Versão 1/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Versão 2/ })).toBeInTheDocument()
  })

  it('nenhum link é marcado como "recomendado" ou "vigente"', async () => {
    renderComRouter(duasVersoes)

    const links = await screen.findAllByRole('link')
    expect(links).toHaveLength(2)
    for (const link of links) {
      const texto = link.textContent?.toLowerCase() ?? ''
      expect(texto).not.toContain('recomendad')
      expect(texto).not.toContain('vigente')
    }
  })
})

describe('ProvedorIndexConteudo: título da aba', () => {
  it('nomeia a aba com o provedor', async () => {
    renderComRouter(umaVersao)

    await screen.findByRole('heading', {
      name: 'Escolha uma versão para ver os campos, avisos e erros conhecidos',
    })
    expect(document.title).toBe('Prefeitura Exemplo | Codex')
  })
})
