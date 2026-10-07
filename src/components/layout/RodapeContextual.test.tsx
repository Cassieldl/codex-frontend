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
  ID_SECAO_VERSOES_APLICAVEIS,
  RodapeContextual,
  type ContextoRodape,
} from './RodapeContextual'

// Contextos com ação para rota interna (`erro-com-contexto`/`provedor-versao`)
// usam `<Link>` do TanStack Router — precisam de um `RouterProvider` de
// verdade, mesmo padrão de `erros-index.test.tsx`.
function renderComRouter(contexto: ContextoRodape) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pagina',
    component: () => <RodapeContextual contexto={contexto} />,
  })
  // Destino real de alguns próximos passos (contexto `artigos`) — sem a rota
  // no tree, o `<Link>` não teria para onde apontar.
  const rotaBusca = createRoute({
    getParentRoute: () => rootRoute,
    path: '/busca',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rota, rotaBusca])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/pagina'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('RodapeContextual', () => {
  it('mostra o próximo passo de busca com resultado', () => {
    render(<RodapeContextual contexto={{ tipo: 'busca-com-resultado' }} />)

    expect(
      screen.getByText(
        'Não achou exatamente o que precisava? Refine a busca ou filtre por provedor.',
      ),
    ).toBeInTheDocument()
  })

  it('mostra o próximo passo de busca sem resultado, com ação de e-mail para o suporte', () => {
    render(<RodapeContextual contexto={{ tipo: 'busca-sem-resultado' }} />)

    expect(screen.getByText(/Buscou e não achou/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Falar com o suporte' })
    expect(link.getAttribute('href')).toContain('mailto:supportbr@migrate.info')
  })

  it('omite o bloco de próximo passo quando o erro é geral, sem contexto de provedor/versão (U9)', () => {
    render(<RodapeContextual contexto={{ tipo: 'erro-sem-contexto' }} />)

    expect(screen.queryByText(/Corrigiu este campo/)).not.toBeInTheDocument()
  })

  it('erro-sem-contexto segue sem próximo passo nem suporte (404, índice, carregando)', () => {
    render(<RodapeContextual contexto={{ tipo: 'erro-sem-contexto' }} />)

    expect(screen.queryByRole('link', { name: 'Falar com o suporte' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Buscar' })).not.toBeInTheDocument()
  })

  it('erro-geral: próximo passo é buscar e o suporte leva o código no assunto e no corpo', async () => {
    renderComRouter({ tipo: 'erro-geral', codigoErro: 'E0042' })

    expect(await screen.findByRole('link', { name: 'Buscar' })).toHaveAttribute('href', '/busca')
    const suporte = screen.getByRole('link', { name: 'Falar com o suporte' })
    expect(suporte.getAttribute('href')).toContain('mailto:supportbr@migrate.info')
    expect(decodeURIComponent(suporte.getAttribute('href') ?? '')).toContain('erro E0042')
    expect(decodeURIComponent(suporte.getAttribute('href') ?? '')).toContain(
      'Código do erro: E0042',
    )
  })

  it('erro-varias-versoes: âncora para a seção de versões e suporte, sem "Ver versão completa"', async () => {
    renderComRouter({ tipo: 'erro-varias-versoes' })

    expect(await screen.findByRole('link', { name: 'Ver as versões aplicáveis' })).toHaveAttribute(
      'href',
      `#${ID_SECAO_VERSOES_APLICAVEIS}`,
    )
    expect(screen.getByRole('link', { name: 'Falar com o suporte' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver versão completa' })).not.toBeInTheDocument()
  })

  it('erro-com-contexto: mantém "Ver versão completa" e acrescenta o suporte', async () => {
    renderComRouter({ tipo: 'erro-com-contexto', provedorSlug: 'ipm', versaoSlug: '2.04' })

    expect(await screen.findByRole('link', { name: 'Ver versão completa' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Falar com o suporte' })).toHaveLength(1)
  })

  it('monta o link de "ver versão completa" com o provedor e a versão do contexto', async () => {
    renderComRouter({ tipo: 'erro-com-contexto', provedorSlug: 'ipm', versaoSlug: '2.04' })

    // `Link` só monta depois que o `RouterProvider` resolve o match inicial
    // (assíncrono) — condição observável, nunca contagem de ticks (AP-FRONTEND-016).
    expect(await screen.findByRole('link', { name: 'Ver versão completa' })).toHaveAttribute(
      'href',
      '/provedores/ipm/2.04',
    )
  })

  it('monta o link de busca filtrada por provedor no contexto de versão', async () => {
    renderComRouter({ tipo: 'provedor-versao', provedorSlug: 'betha' })

    expect(await screen.findByRole('link', { name: 'Buscar' })).toHaveAttribute(
      'href',
      '/busca?provedor=betha',
    )
  })

  it('bloco de atendimento e coluna de links da Migrate são idênticos entre contextos diferentes', () => {
    const { unmount } = render(<RodapeContextual contexto={{ tipo: 'home' }} />)
    const telefoneHome = screen.getByText('+55 11 4240-6556').textContent
    const linksHome = screen
      .getAllByRole('link', { name: /^(InvoiCy|Base de conhecimento|GitHub)$/ })
      .map((link) => link.textContent)
    unmount()

    render(<RodapeContextual contexto={{ tipo: 'provedores' }} />)
    const telefoneProvedores = screen.getByText('+55 11 4240-6556').textContent
    const linksProvedores = screen
      .getAllByRole('link', { name: /^(InvoiCy|Base de conhecimento|GitHub)$/ })
      .map((link) => link.textContent)

    expect(telefoneProvedores).toBe(telefoneHome)
    expect(linksProvedores).toEqual(linksHome)
  })

  it('não declara o conteúdo como fictício — o acervo é real desde o Emissor Nacional', () => {
    render(<RodapeContextual contexto={{ tipo: 'home' }} />)
    const rodape = screen.getByRole('contentinfo')

    expect(rodape.textContent).not.toMatch(/fictíci|demonstração/i)
  })

  it('no contexto "layout", o próximo passo leva para os provedores (§2.7)', async () => {
    renderComRouter({ tipo: 'layout' })

    expect(
      await screen.findByText('Sabe o campo — falta saber como o seu provedor trata ele.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver os provedores' })).toHaveAttribute(
      'href',
      '/provedores',
    )
  })

  it('no contexto "layout-campo", o próximo passo leva ao e-mail de suporte (§2.7)', () => {
    render(<RodapeContextual contexto={{ tipo: 'layout-campo' }} />)

    expect(
      screen.getByText(
        'Um campo do layout está descrito de forma ambígua? Fale com o suporte com o nome do campo.',
      ),
    ).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Falar com o suporte' })
    expect(link.getAttribute('href')).toContain('mailto:supportbr@migrate.info')
    expect(link.getAttribute('href')).toContain('Codex')
  })

  it('no contexto de artigos, o próximo passo leva para a busca', async () => {
    renderComRouter({ tipo: 'artigos' })

    expect(
      await screen.findByText(
        'Está com um chamado aberto? Busque pelo código do erro ou pela mensagem.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buscar' })).toHaveAttribute('href', '/busca')
  })

  it('todo link externo do rodapé abre em nova aba com rel="noopener noreferrer"', () => {
    render(<RodapeContextual contexto={{ tipo: 'home' }} />)

    const linksExternos = screen.getAllByRole('link', {
      name: /^(InvoiCy|Base de conhecimento|GitHub|Abrir chamado)$/,
    })

    expect(linksExternos).toHaveLength(4)

    for (const link of linksExternos) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })
})

describe('RodapeContextual — bloco de atendimento', () => {
  // Literais, não a constante: são os dados reais de contato que o leitor vai usar.
  it('mostra telefone discável, e-mail com link e horário de atendimento', () => {
    render(<RodapeContextual contexto={{ tipo: 'home' }} />)

    expect(screen.getByRole('link', { name: '+55 11 4240-6556' })).toHaveAttribute(
      'href',
      'tel:+551142406556',
    )
    expect(screen.getByRole('link', { name: 'supportbr@migrate.info' })).toHaveAttribute(
      'href',
      'mailto:supportbr@migrate.info',
    )
    expect(screen.getByText('Segunda a sexta-feira, das 08:00 às 18:00')).toBeInTheDocument()
  })

  // Literais: são os destinos reais que o leitor vai seguir.
  it.each([
    ['Abrir chamado', 'https://support.migrate.info/tickets'],
    ['InvoiCy', 'https://invoicy.com.br'],
    ['Base de conhecimento', 'https://desenvolvedores.migrate.info/?utm_source=site'],
    ['GitHub', 'https://github.com/migrate-company/integracao-InvoiCy-BR'],
  ])('o link "%s" leva a %s', (rotulo, destino) => {
    render(<RodapeContextual contexto={{ tipo: 'home' }} />)

    expect(screen.getByRole('link', { name: rotulo })).toHaveAttribute('href', destino)
  })
})
