import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  COMUNICADO_CRITICO_DO_PROVEDOR,
  COMUNICADO_DE_VERSAO,
  COMUNICADO_GLOBAL,
  handlerComunicadosRegistrandoChamadas,
} from '../../../test/mocks/comunicadosContexto'
import { server } from '../../../test/mocks/server'
import { ComunicadosDoContexto, type ComunicadosDoContextoProps } from './ComunicadosDoContexto'

const API_URL = import.meta.env.VITE_API_URL
const ANCORA_DE_MONTAGEM = 'âncora de montagem'

function renderBloco(props: ComunicadosDoContextoProps) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRoute({ component: Outlet })
  const rotaPagina = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <>
        <p>{ANCORA_DE_MONTAGEM}</p>
        <ComunicadosDoContexto {...props} />
      </>
    ),
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rotaPagina]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('ComunicadosDoContexto', () => {
  it('mostra severidade, alvo, vigência, título e corpo do comunicado do provedor', async () => {
    const { handler } = handlerComunicadosRegistrandoChamadas([COMUNICADO_CRITICO_DO_PROVEDOR])
    server.use(handler)

    renderBloco({ provedorSlugs: ['prefeitura-exemplo'] })

    const secao = await screen.findByRole('region', { name: 'Comunicados ativos' })
    expect(within(secao).getByText('Crítico')).toBeInTheDocument()
    expect(within(secao).getByText('Prefeitura de Exemplo')).toBeInTheDocument()
    expect(within(secao).getByText(/Vigente até 08\/10\/2026/)).toBeInTheDocument()
    expect(
      within(secao).getByRole('heading', { level: 3, name: 'Instabilidade na emissão' }),
    ).toBeInTheDocument()
    expect(within(secao).getByText(/A prefeitura recusa a emissão\./)).toBeInTheDocument()
  })

  it('o crítico é anunciado como alerta; os demais não', async () => {
    const { handler } = handlerComunicadosRegistrandoChamadas([
      COMUNICADO_CRITICO_DO_PROVEDOR,
      COMUNICADO_DE_VERSAO,
      COMUNICADO_GLOBAL,
    ])
    server.use(handler)

    renderBloco({ provedorSlugs: ['prefeitura-exemplo'] })

    const alertas = await screen.findAllByRole('alert')
    expect(alertas).toHaveLength(1)
    expect(within(alertas[0]).getByText('Instabilidade na emissão')).toBeInTheDocument()
  })

  it('preserva a quebra de parágrafo do corpo', async () => {
    const { handler } = handlerComunicadosRegistrandoChamadas([COMUNICADO_CRITICO_DO_PROVEDOR])
    server.use(handler)

    renderBloco({ provedorSlugs: ['prefeitura-exemplo'] })

    const corpo = await screen.findByText(/A prefeitura recusa a emissão\./)
    expect(corpo).toHaveClass('whitespace-pre-line')
  })

  it('comunicado de versão diz a qual versão se refere e leva a ela pelo `url`', async () => {
    const { handler } = handlerComunicadosRegistrandoChamadas([COMUNICADO_DE_VERSAO])
    server.use(handler)

    renderBloco({
      provedorSlugs: ['prefeitura-exemplo'],
      caminhoAtual: '/provedores/prefeitura-exemplo',
    })

    expect(await screen.findByText('Prefeitura de Exemplo · 2.04')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver versão 2.04' })).toHaveAttribute(
      'href',
      '/provedores/prefeitura-exemplo/2-04',
    )
  })

  it('não oferece o link que levaria à própria página', async () => {
    const { handler } = handlerComunicadosRegistrandoChamadas([
      COMUNICADO_CRITICO_DO_PROVEDOR,
      COMUNICADO_DE_VERSAO,
    ])
    server.use(handler)

    renderBloco({
      provedorSlugs: ['prefeitura-exemplo'],
      caminhoAtual: '/provedores/prefeitura-exemplo',
    })

    await screen.findByText('Instabilidade na emissão')
    expect(screen.queryByRole('link', { name: 'Ver provedor' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver versão 2.04' })).toBeInTheDocument()
  })

  it('na página do erro (sem caminho próprio), o comunicado do provedor leva ao provedor', async () => {
    const { handler } = handlerComunicadosRegistrandoChamadas([COMUNICADO_CRITICO_DO_PROVEDOR])
    server.use(handler)

    renderBloco({ provedorSlugs: ['prefeitura-exemplo'] })

    expect(await screen.findByRole('link', { name: 'Ver provedor' })).toHaveAttribute(
      'href',
      '/provedores/prefeitura-exemplo',
    )
  })

  it('comunicado global: alvo "Todos os provedores" e nenhum link', async () => {
    const { handler } = handlerComunicadosRegistrandoChamadas([COMUNICADO_GLOBAL])
    server.use(handler)

    renderBloco({ provedorSlugs: [] })

    expect(await screen.findByText('Todos os provedores')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('não segue um `url` que não seja caminho interno', async () => {
    const { handler } = handlerComunicadosRegistrandoChamadas([
      { ...COMUNICADO_CRITICO_DO_PROVEDOR, url: 'https://outro-site.example/provedores/x' },
    ])
    server.use(handler)

    renderBloco({ provedorSlugs: ['prefeitura-exemplo'] })

    await screen.findByText('Instabilidade na emissão')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('lista vazia não renderiza bloco nenhum', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([])
    server.use(handler)

    renderBloco({ provedorSlugs: ['prefeitura-exemplo'] })

    await screen.findByText(ANCORA_DE_MONTAGEM)
    await waitFor(() => expect(chamadas).toHaveLength(1))
    expect(screen.queryByRole('region', { name: 'Comunicados ativos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Comunicados ativos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('falha do endpoint vira uma linha discreta, com nova tentativa que traz o comunicado', async () => {
    let falhar = true
    server.use(
      http.get(`${API_URL}/comunicados`, () =>
        falhar
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json({ data: [COMUNICADO_GLOBAL] }),
      ),
    )

    renderBloco({ provedorSlugs: [] })

    const aviso = await screen.findByRole('status')
    expect(aviso).toHaveTextContent('Não foi possível verificar os comunicados agora.')
    expect(screen.queryByRole('region', { name: 'Comunicados ativos' })).not.toBeInTheDocument()

    falhar = false
    await userEvent.click(within(aviso).getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Manutenção programada da plataforma')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('resposta no envelope errado (crua) cai no aviso discreto, nunca em bloco vazio', async () => {
    server.use(http.get(`${API_URL}/comunicados`, () => HttpResponse.json([COMUNICADO_GLOBAL])))

    renderBloco({ provedorSlugs: [] })

    expect(await screen.findByRole('status')).toHaveTextContent('Não foi possível verificar')
    expect(screen.queryByText('Manutenção programada da plataforma')).not.toBeInTheDocument()
  })

  it('enquanto carrega, não ocupa lugar', async () => {
    server.use(
      http.get(`${API_URL}/comunicados`, async () => {
        await new Promise((resolver) => setTimeout(resolver, 200))
        return HttpResponse.json({ data: [] })
      }),
    )

    renderBloco({ provedorSlugs: ['x'] })

    await screen.findByText(ANCORA_DE_MONTAGEM)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })
})
