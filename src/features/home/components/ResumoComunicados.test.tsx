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

    expect(await screen.findByText(/IPM Sistemas:/)).toBeInTheDocument()
    expect(screen.queryByText(/Nacional\/ADN:/)).not.toBeInTheDocument()

    const botao = screen.getByRole('button', { name: '+2 outros' })
    expect(botao).toHaveAttribute('aria-expanded', 'false')

    await usuario.click(botao)

    expect(screen.getByText(/Nacional\/ADN:/)).toBeInTheDocument()
    expect(screen.getByText(/Prefeitura de Exemplo:/)).toBeInTheDocument()

    const recolher = screen.getByRole('button', { name: 'Mostrar menos' })
    expect(recolher).toHaveAttribute('aria-expanded', 'true')

    await usuario.click(recolher)

    expect(screen.queryByText(/Nacional\/ADN:/)).not.toBeInTheDocument()
  })

  it('não oferece botão de expandir quando tudo já cabe na linha', async () => {
    renderResumo([comunicado('IPM Sistemas'), comunicado('Betha', 'Informativo')])

    expect(await screen.findByText(/IPM Sistemas:/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /outro/ })).not.toBeInTheDocument()
  })

  /**
   * O título ia só em `title=`, que teclado não alcança, e o chip global era um
   * `<span>` — o comunicado que o PRD §2.1 nomeia entregava zero informação.
   */
  it('mostra o título no texto do chip, inclusive no global, que não tem link', async () => {
    renderResumo([comunicado('IPM Sistemas'), comunicado(null, 'Informativo')])

    expect(
      await screen.findByRole('button', { name: /IPM Sistemas: Comunicado de IPM Sistemas/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Todos os provedores: Comunicado de todos/ }),
    ).toBeInTheDocument()
  })

  it('abre o corpo do comunicado ao clicar no chip e o fecha no segundo clique', async () => {
    const usuario = userEvent.setup()
    renderResumo([comunicado(null, 'Informativo')])

    const chip = await screen.findByRole('button', { name: /Todos os provedores:/ })
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Detalhe do comunicado.')).not.toBeInTheDocument()

    await usuario.click(chip)

    expect(chip).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Detalhe do comunicado.')).toBeInTheDocument()

    await usuario.click(chip)

    expect(screen.queryByText('Detalhe do comunicado.')).not.toBeInTheDocument()
  })

  it('só o comunicado de provedor oferece o link, porque só ele tem para onde ir', async () => {
    const usuario = userEvent.setup()
    renderResumo([comunicado('IPM Sistemas'), comunicado(null, 'Informativo')])

    await usuario.click(await screen.findByRole('button', { name: /Todos os provedores:/ }))
    expect(screen.queryByRole('link')).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /IPM Sistemas:/ }))
    expect(screen.getByRole('link', { name: 'Ver provedor' })).toHaveAttribute(
      'href',
      '/provedores/ipm',
    )
  })
})

/**
 * O chip trunca o texto por necessidade, mas em `max-w-xs` cortava antes do assunto: descontada a
 * etiqueta de severidade, o prefixo do alvo consumia a faixa toda e sobrava "Todos os provedores:
 * Tra...".
 *
 * O jsdom não faz layout, então a asserção é sobre a faixa declarada — a medida real só existe no
 * navegador. Asserção fraca de propósito: trava a regressão exata sem fingir que mede largura.
 */
describe('ResumoComunicados — faixa do chip', () => {
  it('reserva largura suficiente para o assunto, não só para o prefixo', async () => {
    renderResumo([comunicado(null)])

    const chip = await screen.findByRole('button', { name: /Comunicado de todos/ })

    expect(chip.className).toContain('max-w-md')
    expect(chip.className).not.toContain('max-w-xs')
  })
})
