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
import type { LayoutResumoHome } from '../types/home'
import { BlocoLayoutHome } from './BlocoLayoutHome'

const layout: LayoutResumoHome = {
  vigente: { slug: '4-12', rotulo: '4.12' },
  prevista: { slug: '4-13', rotulo: '4.13' },
  descricao: 'Novo grupo de retenções e dois campos de intermediário descontinuados.',
  camposNovos: 6,
  camposDescontinuados: 2,
}

/**
 * Âncora de montagem — `RouterProvider` monta de forma assíncrona, e afirmar
 * `container` vazio logo depois de `render` passa mesmo com a seção
 * renderizando. Ausência só vale depois de esperar por isto.
 */
const ANCORA = 'rota montada'

function renderBloco(resumo: LayoutResumoHome | null) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaHome = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <>
        <p>{ANCORA}</p>
        <BlocoLayoutHome layout={resumo} />
      </>
    ),
  })
  const rotaLayout = createRoute({
    getParentRoute: () => rootRoute,
    path: '/layout',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rotaHome, rotaLayout])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('BlocoLayoutHome', () => {
  it('não renderiza a seção quando não há layout publicado', async () => {
    renderBloco(null)

    await screen.findByText(ANCORA)
    expect(screen.queryByRole('heading', { name: 'Layout InvoiCy' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver detalhes' })).not.toBeInTheDocument()
  })

  it('mostra vigente, prevista e as mudanças', async () => {
    renderBloco(layout)

    expect(await screen.findByRole('heading', { name: 'Layout InvoiCy' })).toBeInTheDocument()
    expect(screen.getByText('Versão 4.12')).toBeInTheDocument()
    expect(screen.getByText('Versão 4.13 prevista')).toBeInTheDocument()
    expect(screen.getByText('6 campos novos · 2 descontinuados')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver detalhes' })).toHaveAttribute('href', '/layout')
  })

  /**
   * Detector do DEFEITO-01. O contrato não tem data de publicação de versão de layout (B-6), e a
   * fixture acima é o shape REAL do servidor. Antes desta correção o tipo declarava
   * `publicadaEm` como obrigatório, o componente o formatava e `parseISO(undefined)` derrubava a
   * Home inteira — com a suíte verde, porque as fixtures escreviam o campo à mão.
   *
   * A asserção é de ausência do rótulo: se alguém voltar a prometer a data, este teste cai.
   */
  it('não promete data de publicação — o contrato não tem esse campo', async () => {
    renderBloco(layout)

    await screen.findByRole('heading', { name: 'Layout InvoiCy' })
    expect(screen.queryByText(/publicada em/i)).not.toBeInTheDocument()
  })

  it('cala a linha de mudanças quando não há campo novo nem descontinuado', async () => {
    // Descrição sem as palavras-alvo: o que se afirma aqui é a ausência da
    // linha de contagem, não a ausência do texto editorial.
    renderBloco({
      ...layout,
      descricao: 'Ajustes de redação nos significados.',
      camposNovos: 0,
      camposDescontinuados: 0,
    })

    expect(await screen.findByText('Versão 4.12')).toBeInTheDocument()
    expect(screen.queryByText(/campos? novos?/)).not.toBeInTheDocument()
    expect(screen.queryByText(/descontinuado/)).not.toBeInTheDocument()
  })

  it('usa singular quando há exatamente um campo de cada lado', async () => {
    renderBloco({ ...layout, camposNovos: 1, camposDescontinuados: 1 })

    expect(await screen.findByText('1 campo novo · 1 descontinuado')).toBeInTheDocument()
  })

  it('omite a prevista quando não há próxima versão anunciada', async () => {
    renderBloco({ ...layout, prevista: null })

    expect(await screen.findByText('Versão 4.12')).toBeInTheDocument()
    expect(screen.queryByText(/prevista/)).not.toBeInTheDocument()
  })
})
