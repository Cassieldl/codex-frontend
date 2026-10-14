import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HistoricoVersoesLayout, type HistoricoVersoesLayoutProps } from './HistoricoVersoesLayout'

const VERSOES = [
  { slug: '4-13', rotulo: '4.13', estado: 'Prevista', ordem: 3, totalCampos: 560 },
  { slug: '4-12', rotulo: '4.12', estado: 'Vigente', ordem: 2, totalCampos: 545 },
  { slug: '4-10', rotulo: '4.10', estado: 'Anterior', ordem: 1, totalCampos: 1 },
] as HistoricoVersoesLayoutProps['versoes']

const ANCORA = 'rota montada'

function renderHistorico(props: HistoricoVersoesLayoutProps) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <>
        <p>{ANCORA}</p>
        <HistoricoVersoesLayout {...props} />
      </>
    ),
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('HistoricoVersoesLayout', () => {
  it('escreve "Versão" em cada pílula, na ordem recebida', async () => {
    renderHistorico({ versoes: VERSOES, versaoAtualSlug: '4-12' })

    const itens = await screen.findAllByRole('listitem')
    expect(itens).toHaveLength(3)
    expect(itens.map((item) => item.textContent?.match(/^Versão \d+\.\d+/)?.[0])).toEqual([
      'Versão 4.13',
      'Versão 4.12',
      'Versão 4.10',
    ])
  })

  it('marca "Você está vendo esta versão" só na atual e oferece link nas demais', async () => {
    renderHistorico({ versoes: VERSOES, versaoAtualSlug: '4-12' })

    const itens = await screen.findAllByRole('listitem')
    const [prevista, vigente, anterior] = itens as [HTMLElement, HTMLElement, HTMLElement]

    expect(within(vigente).getByText('Você está vendo esta versão')).toBeInTheDocument()
    expect(within(vigente).queryByRole('link')).not.toBeInTheDocument()
    expect(within(prevista).getByRole('link', { name: 'Ver o dicionário' })).toHaveAttribute(
      'href',
      '/layout/4-13',
    )
    expect(within(anterior).getByRole('link', { name: 'Ver o dicionário' })).toHaveAttribute(
      'href',
      '/layout/4-10',
    )
    expect(screen.getAllByText('Você está vendo esta versão')).toHaveLength(1)
  })

  it('não repete a palavra quando o rótulo do dado já a traz', async () => {
    renderHistorico({
      versoes: [
        { slug: '4-12', rotulo: 'Versão 4.12', estado: 'Vigente', ordem: 1, totalCampos: 1 },
      ],
    })

    const item = await screen.findByRole('listitem')
    expect(item.textContent).toMatch(/^Versão 4\.12/)
    expect(item.textContent).not.toMatch(/vers[aã]o\s+vers[aã]o/i)
  })

  it('não renderiza nada sem versões', async () => {
    renderHistorico({ versoes: [] })

    await screen.findByText(ANCORA)
    expect(screen.queryByRole('heading', { name: 'Histórico de versões' })).not.toBeInTheDocument()
  })
})
