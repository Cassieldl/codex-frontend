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
  ID_SECAO_PROVEDORES_APLICAVEIS,
  RodapeContextual,
  type ContextoRodape,
} from './RodapeContextual'

// Contextos com ação para rota interna (`erro-com-contexto`/`layout`)
// usam `<Link>` do TanStack Router — precisam de um `RouterProvider` de
// verdade, mesmo padrão de `erros-index.test.tsx`.
async function renderComRouter(contexto: ContextoRodape) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pagina',
    component: () => <RodapeContextual contexto={contexto} />,
  })
  const routeTree = rootRoute.addChildren([rota])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/pagina'] }),
  })

  const resultado = render(<RouterProvider router={router} />)
  await screen.findByRole('contentinfo')

  return resultado
}

describe('RodapeContextual', () => {
  // A busca mora no cabeçalho: a faixa só ficaria repetindo o que já está na tela.
  it.each<ContextoRodape>([
    { tipo: 'home' },
    { tipo: 'busca-com-resultado' },
    { tipo: 'provedores' },
    { tipo: 'artigos' },
    { tipo: 'provedor', provedorSlug: 'betha' },
  ])('sem faixa de próximo passo no contexto $tipo', async (contexto) => {
    await renderComRouter(contexto)

    expect(screen.queryByText('Próximo passo')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Buscar' })).not.toBeInTheDocument()
  })

  it('mostra o próximo passo de busca sem resultado, com ação de e-mail para o suporte', async () => {
    await renderComRouter({ tipo: 'busca-sem-resultado' })

    expect(screen.getByText(/Buscou e não achou/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Falar com o suporte' })
    expect(link.getAttribute('href')).toContain('mailto:supportbr@migrate.info')
  })

  it('omite o bloco de próximo passo quando o erro é geral, sem contexto de provedor/versão (U9)', async () => {
    await renderComRouter({ tipo: 'erro-sem-contexto' })

    expect(screen.queryByText(/Corrigiu este campo/)).not.toBeInTheDocument()
  })

  it('erro-sem-contexto segue sem próximo passo nem suporte (404, índice, carregando)', async () => {
    await renderComRouter({ tipo: 'erro-sem-contexto' })

    expect(screen.queryByRole('link', { name: 'Falar com o suporte' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Buscar' })).not.toBeInTheDocument()
  })

  it('erro-geral: só o suporte, que leva o código no assunto e no corpo', async () => {
    await renderComRouter({ tipo: 'erro-geral', codigoErro: 'E0042' })

    expect(screen.queryByRole('link', { name: 'Buscar' })).not.toBeInTheDocument()
    const suporte = screen.getByRole('link', { name: 'Falar com o suporte' })
    expect(suporte.getAttribute('href')).toContain('mailto:supportbr@migrate.info')
    expect(decodeURIComponent(suporte.getAttribute('href') ?? '')).toContain('erro E0042')
    expect(decodeURIComponent(suporte.getAttribute('href') ?? '')).toContain(
      'Código do erro: E0042',
    )
  })

  it('erro-varios-provedores: âncora para a seção de provedores e suporte, sem "Ver o provedor completo"', async () => {
    await renderComRouter({ tipo: 'erro-varios-provedores' })

    expect(
      await screen.findByRole('link', { name: 'Ver os provedores aplicáveis' }),
    ).toHaveAttribute('href', `#${ID_SECAO_PROVEDORES_APLICAVEIS}`)
    expect(screen.getByRole('link', { name: 'Falar com o suporte' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver o provedor completo' })).not.toBeInTheDocument()
  })

  it('erro-com-contexto: mantém "Ver o provedor completo" e acrescenta o suporte', async () => {
    await renderComRouter({ tipo: 'erro-com-contexto', provedorSlug: 'ipm' })

    expect(await screen.findByRole('link', { name: 'Ver o provedor completo' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Falar com o suporte' })).toHaveLength(1)
  })

  it('erro-com-contexto: só fala em "corrigir o campo" quando o erro tem campo relacionado', async () => {
    const comCampo = await renderComRouter({
      tipo: 'erro-com-contexto',
      provedorSlug: 'ipm',
      temCampoRelacionado: true,
    })
    expect(
      await screen.findByText('Corrigiu este campo? Confira o resto do provedor.'),
    ).toBeInTheDocument()
    comCampo.unmount()

    await renderComRouter({
      tipo: 'erro-com-contexto',
      provedorSlug: 'ipm',
      temCampoRelacionado: false,
    })
    expect(
      await screen.findByText('Resolveu este erro? Confira o resto do provedor.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Corrigiu este campo/)).not.toBeInTheDocument()
  })

  it('monta o link de "ver o provedor completo" sem versão no endereço', async () => {
    await renderComRouter({ tipo: 'erro-com-contexto', provedorSlug: 'ipm' })

    // `Link` só monta depois que o `RouterProvider` resolve o match inicial
    // (assíncrono) — condição observável, nunca contagem de ticks (AP-FRONTEND-016).
    expect(await screen.findByRole('link', { name: 'Ver o provedor completo' })).toHaveAttribute(
      'href',
      '/provedores/ipm',
    )
  })

  it('bloco de atendimento e coluna de links da Migrate são idênticos entre contextos diferentes', async () => {
    const { unmount } = await renderComRouter({ tipo: 'busca-com-resultado' })
    const telefoneHome = screen.getByText('+55 11 4240-6556').textContent
    const linksHome = screen
      .getAllByRole('link', { name: /^(InvoiCy|Base de conhecimento|GitHub)$/ })
      .map((link) => link.textContent)
    unmount()

    await renderComRouter({ tipo: 'provedores' })
    const telefoneProvedores = screen.getByText('+55 11 4240-6556').textContent
    const linksProvedores = screen
      .getAllByRole('link', { name: /^(InvoiCy|Base de conhecimento|GitHub)$/ })
      .map((link) => link.textContent)

    expect(telefoneProvedores).toBe(telefoneHome)
    expect(linksProvedores).toEqual(linksHome)
  })

  it('não declara o conteúdo como fictício — o acervo é real desde o Emissor Nacional', async () => {
    await renderComRouter({ tipo: 'busca-com-resultado' })
    const rodape = screen.getByRole('contentinfo')

    expect(rodape.textContent).not.toMatch(/fictíci|demonstração/i)
  })

  it('no contexto "layout", o próximo passo leva para os provedores (§2.7)', async () => {
    await renderComRouter({ tipo: 'layout' })

    expect(
      await screen.findByText('Sabe o campo, falta saber como o seu provedor trata ele.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver os provedores' })).toHaveAttribute(
      'href',
      '/provedores',
    )
  })

  it('no contexto "layout-campo", o próximo passo leva ao e-mail de suporte (§2.7)', async () => {
    await renderComRouter({ tipo: 'layout-campo' })

    expect(
      screen.getByText(
        'Um campo do layout está descrito de forma ambígua? Fale com o suporte com o nome do campo.',
      ),
    ).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Falar com o suporte' })
    expect(link.getAttribute('href')).toContain('mailto:supportbr@migrate.info')
    expect(link.getAttribute('href')).toContain('Codex')
  })

  it('sem passo específico, a faixa oferece o chamado; com passo, a faixa é o passo', async () => {
    const { unmount } = await renderComRouter({ tipo: 'home' })

    expect(
      screen.getByRole('heading', { name: 'Não achou a resposta no Codex?' }),
    ).toBeInTheDocument()
    unmount()

    await renderComRouter({ tipo: 'busca-sem-resultado' })

    expect(screen.queryByText('Não achou a resposta no Codex?')).not.toBeInTheDocument()
  })

  it('o link de chamado aparece mesmo sem próximo passo', async () => {
    await renderComRouter({ tipo: 'erro-sem-contexto' })

    expect(screen.getByRole('link', { name: 'Abrir chamado' })).toHaveAttribute(
      'href',
      'https://support.migrate.info/tickets',
    )
  })

  it('todo link externo do rodapé abre em nova aba com rel="noopener noreferrer"', async () => {
    await renderComRouter({ tipo: 'busca-com-resultado' })

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
  it('mostra telefone discável, e-mail com link e horário de atendimento', async () => {
    await renderComRouter({ tipo: 'busca-com-resultado' })

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
  ])('o link "%s" leva a %s', async (rotulo, destino) => {
    await renderComRouter({ tipo: 'busca-com-resultado' })

    expect(screen.getByRole('link', { name: rotulo })).toHaveAttribute('href', destino)
  })
})
