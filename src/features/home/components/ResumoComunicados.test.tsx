import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ComunicadoVigenteHome, SeveridadeComunicado } from '../types/home'
import { ResumoComunicados } from './ResumoComunicados'

function comunicado(
  provedorNome: string | null,
  severidade: SeveridadeComunicado = 'Alerta',
): ComunicadoVigenteHome {
  return {
    titulo: `Comunicado de ${provedorNome ?? 'todos'}`,
    corpo: 'Detalhe do comunicado.',
    severidade,
    abrangencia: provedorNome === null ? 'Global' : 'Provedor',
    expiraEm: '2026-09-01T12:00:00',
    provedorNome,
    url: provedorNome === null ? null : '/provedores/ipm',
  }
}

/**
 * Âncora de montagem — `RouterProvider` monta de forma assíncrona, e afirmar
 * `container` vazio logo depois de `render` passa mesmo com o componente
 * renderizando. Ausência só vale depois de esperar por isto.
 */
const ANCORA = 'rota montada'

function renderResumo(comunicados: ComunicadoVigenteHome[]) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaHome = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <>
        <p>{ANCORA}</p>
        <ResumoComunicados comunicados={comunicados} />
      </>
    ),
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

describe('ResumoComunicados', () => {
  it('não renderiza a linha quando não há comunicado não crítico', async () => {
    renderResumo([])

    await screen.findByText(ANCORA)
    expect(screen.queryByText('Comunicados ativos')).not.toBeInTheDocument()
  })

  it('não repete na linha os críticos, que já ocupam a faixa do topo', async () => {
    renderResumo([comunicado('Nacional/ADN', 'Critico')])

    await screen.findByText(ANCORA)
    expect(screen.queryByText('Comunicados ativos')).not.toBeInTheDocument()
    expect(screen.queryByText('Nacional/ADN')).not.toBeInTheDocument()
  })

  it('mostra os três primeiros chips e esconde o resto atrás de um botão', async () => {
    const usuario = userEvent.setup()
    renderResumo([
      comunicado('IPM Sistemas'),
      comunicado('Betha', 'Informativo'),
      comunicado('ISS.net'),
      comunicado('Nacional/ADN'),
      comunicado('Prefeitura de Exemplo', 'Informativo'),
    ])

    expect(await screen.findByText('IPM Sistemas')).toBeInTheDocument()
    expect(screen.queryByText('Nacional/ADN')).not.toBeInTheDocument()

    const botao = screen.getByRole('button', { name: '+2 outros' })
    expect(botao).toHaveAttribute('aria-expanded', 'false')

    await usuario.click(botao)

    expect(screen.getByText('Nacional/ADN')).toBeInTheDocument()
    expect(screen.getByText('Prefeitura de Exemplo')).toBeInTheDocument()

    const recolher = screen.getByRole('button', { name: 'Mostrar menos' })
    expect(recolher).toHaveAttribute('aria-expanded', 'true')

    await usuario.click(recolher)

    expect(screen.queryByText('Nacional/ADN')).not.toBeInTheDocument()
  })

  it('não oferece botão de expandir quando tudo já cabe na linha', async () => {
    renderResumo([comunicado('IPM Sistemas'), comunicado('Betha', 'Informativo')])

    expect(await screen.findByText('IPM Sistemas')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('chip de provedor é link; chip global é texto, porque não há provedor a abrir', async () => {
    renderResumo([comunicado('IPM Sistemas'), comunicado(null, 'Informativo')])

    expect(await screen.findByRole('link', { name: /IPM Sistemas/ })).toHaveAttribute(
      'href',
      '/provedores/ipm',
    )
    expect(screen.getByText('Todos os provedores')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Todos os provedores/ })).not.toBeInTheDocument()
  })
})
