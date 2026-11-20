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
import type { ComunicadoVigenteHome } from '../types/home'
import { FaixaComunicadoCritico } from './FaixaComunicadoCritico'

const critico: ComunicadoVigenteHome = {
  titulo: 'transmissão indisponível em Produção desde 08h20',
  corpo: 'A prefeitura está com o serviço fora do ar.',
  severidade: 'Critico',
  abrangencia: 'Provedor',
  expiraEm: '2026-08-19T09:00:00',
  provedorNome: 'Nacional/ADN',
  url: '/provedores/nacional-adn',
}

const alerta: ComunicadoVigenteHome = {
  titulo: 'Certificado expira em 15 dias',
  corpo: 'Renove antes do vencimento.',
  severidade: 'Alerta',
  abrangencia: 'Provedor',
  expiraEm: '2026-09-01T12:00:00',
  provedorNome: 'IPM Sistemas',
  url: '/provedores/ipm',
}

/**
 * Âncora de montagem. `RouterProvider` monta de forma assíncrona: afirmar
 * `container` vazio logo depois de `render` passa mesmo quando o componente
 * renderiza de fato — o DOM ainda está vazio porque o router não chegou lá.
 * Toda asserção de ausência aqui espera esta âncora primeiro.
 */
const ANCORA = 'rota montada'

function renderFaixa(comunicados: ComunicadoVigenteHome[]) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaHome = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <>
        <p>{ANCORA}</p>
        <FaixaComunicadoCritico comunicados={comunicados} />
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

describe('FaixaComunicadoCritico', () => {
  it('anuncia o comunicado crítico com ícone, a palavra "Crítico" e role="alert"', async () => {
    renderFaixa([critico])

    const faixa = await screen.findByRole('alert')
    expect(faixa).toHaveTextContent('Crítico')
    expect(faixa).toHaveTextContent(
      'Nacional/ADN: transmissão indisponível em Produção desde 08h20',
    )
    expect(faixa).toHaveTextContent('Vigente até 19/08/2026, 09:00')
    expect(screen.getByRole('link', { name: 'Ver detalhe' })).toHaveAttribute(
      'href',
      '/provedores/nacional-adn',
    )
  })

  it('não renderiza nada quando nenhum comunicado é crítico', async () => {
    renderFaixa([alerta])

    await screen.findByText(ANCORA)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/Certificado expira/)).not.toBeInTheDocument()
  })

  it('não renderiza nada quando não há comunicado nenhum', async () => {
    renderFaixa([])

    await screen.findByText(ANCORA)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('fecha ao dispensar e não reabre na mesma sessão', async () => {
    const usuario = userEvent.setup()
    renderFaixa([critico])

    await screen.findByRole('alert')
    await usuario.click(
      screen.getByRole('button', { name: 'Dispensar este comunicado nesta sessão' }),
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('expande os demais críticos por botão com aria-expanded, nunca por link mudo', async () => {
    const usuario = userEvent.setup()
    const segundoCritico: ComunicadoVigenteHome = {
      ...critico,
      titulo: 'lentidão no ambiente de homologação',
      provedorNome: 'IPM Sistemas',
      url: '/provedores/ipm',
    }
    renderFaixa([critico, segundoCritico])

    const botao = await screen.findByRole('button', { name: '+1 outro' })
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/lentidão no ambiente de homologação/)).not.toBeInTheDocument()

    await usuario.click(botao)

    expect(screen.getByRole('button', { name: 'Recolher' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(
      screen.getByText('IPM Sistemas: lentidão no ambiente de homologação'),
    ).toBeInTheDocument()
  })

  it('comunicado global não vira link — sem provedor, não há detalhe para abrir', async () => {
    renderFaixa([
      {
        ...critico,
        abrangencia: 'Global',
        provedorNome: null,
        url: null,
        titulo: 'manutenção programada do Codex',
      },
    ])

    const faixa = await screen.findByRole('alert')
    expect(faixa).toHaveTextContent('Todos os provedores: manutenção programada do Codex')
    expect(screen.queryByRole('link', { name: 'Ver detalhe' })).not.toBeInTheDocument()
  })
})
