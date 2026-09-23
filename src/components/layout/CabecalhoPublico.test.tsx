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
import { CabecalhoPublico, ID_CONTEUDO_PRINCIPAL } from './CabecalhoPublico'

// `<Link>` do TanStack Router precisa de um `RouterProvider` real — mesmo
// padrão de `RodapeContextual.test.tsx`. As rotas de destino (`/artigos`,
// `/como-funciona`) ainda não existem nesta unidade (nascem em FRONT-B):
// a árvore de teste só precisa da rota que hospeda o componente.
function renderComRouter() {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pagina',
    component: () => <CabecalhoPublico />,
  })
  const routeTree = rootRoute.addChildren([rota])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/pagina'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('CabecalhoPublico — navegação (M31/§4.1)', () => {
  it('mostra "Layout InvoiCy" apontando para /layout, entre Provedores e Artigos (§2.6)', async () => {
    renderComRouter()

    expect(await screen.findByRole('link', { name: 'Layout InvoiCy' })).toHaveAttribute(
      'href',
      '/layout',
    )

    const nomes = screen.getAllByRole('link').map((link) => link.textContent)
    expect(nomes.indexOf('Provedores')).toBeLessThan(nomes.indexOf('Layout InvoiCy'))
    expect(nomes.indexOf('Layout InvoiCy')).toBeLessThan(nomes.indexOf('Artigos'))
  })

  it('mostra "Artigos" apontando para /artigos com pagina=1', async () => {
    renderComRouter()

    expect(await screen.findByRole('link', { name: 'Artigos' })).toHaveAttribute(
      'href',
      '/artigos?pagina=1',
    )
  })

  it('mostra "Como funciona" apontando para /como-funciona, sempre presente', async () => {
    renderComRouter()

    expect(await screen.findByRole('link', { name: 'Como funciona' })).toHaveAttribute(
      'href',
      '/como-funciona',
    )
  })

  it('mantém "Provedores" existente intacto', async () => {
    renderComRouter()

    expect(await screen.findByRole('link', { name: 'Provedores' })).toHaveAttribute(
      'href',
      '/provedores?pagina=1',
    )
  })
})

// A tela real que expõe o defeito é `/layout/{versaoSlug}`: o chip da versão
// aberta marca `aria-current="page"` por prop (`ChipVersaoLayout`), e o item
// "Layout InvoiCy" do menu marcava o mesmo por casamento parcial de CAMINHO
// feito pelo próprio `<Link>`. O teste reproduz as duas regiões juntas e
// CONTA — "o item certo está marcado" passaria com dois marcados.
function renderComRotasAninhadas(caminhoInicial: string) {
  const rootRoute = createRootRoute({ component: Outlet })
  const paginaComChip = (
    <>
      <CabecalhoPublico />
      <main>
        <a href="/layout/v2-01" aria-current="page">
          Versão 2.01
        </a>
      </main>
    </>
  )
  const layoutIndex = createRoute({
    getParentRoute: () => rootRoute,
    path: '/layout',
    component: () => <CabecalhoPublico />,
  })
  const layoutVersao = createRoute({
    getParentRoute: () => rootRoute,
    path: '/layout/$versaoSlug',
    component: () => paginaComChip,
  })
  const routeTree = rootRoute.addChildren([layoutIndex, layoutVersao])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [caminhoInicial] }),
  })

  return render(<RouterProvider router={router} />)
}

function contarMarcadosEm(regiao: HTMLElement) {
  return within(regiao)
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') !== null).length
}

describe('CabecalhoPublico — aria-current (casamento parcial de caminho)', () => {
  it('em subpágina da seção, a nav não marca nada — o "página atual" é só o da página', async () => {
    renderComRotasAninhadas('/layout/v2-01')
    await screen.findByRole('link', { name: 'Layout InvoiCy' })

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    const conteudo = screen.getByRole('main')

    expect(contarMarcadosEm(nav)).toBe(0)
    expect(contarMarcadosEm(conteudo)).toBe(1)
  })

  it('a página inteira nunca tem mais de um aria-current', async () => {
    const { container } = renderComRotasAninhadas('/layout/v2-01')
    await screen.findByRole('link', { name: 'Layout InvoiCy' })

    const marcados = container.querySelectorAll('[aria-current]')
    expect(Array.from(marcados).map((no) => no.textContent)).toEqual(['Versão 2.01'])
  })

  // Invariante do roteador, não detector de prop: `to="/"` não recebe
  // `activeOptions` porque o casamento parcial exige `/` no caractere seguinte
  // ao destino, e para o destino `/` esse caractere é a primeira letra da
  // rota. Este teste cai se essa regra mudar na biblioteca.
  it('o logo não vira "página atual" em toda página só por apontar para a raiz', async () => {
    renderComRotasAninhadas('/layout/v2-01')

    expect(await screen.findByRole('link', { name: 'Codex' })).not.toHaveAttribute('aria-current')
  })

  it('na própria página da seção o item continua marcado — o exact não apaga o certo', async () => {
    renderComRotasAninhadas('/layout')
    const nav = await screen.findByRole('navigation', { name: 'Navegação principal' })

    expect(within(nav).getByRole('link', { name: 'Layout InvoiCy' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(contarMarcadosEm(nav)).toBe(1)
  })
})

/**
 * 2.4.1 Bypass Blocks. O link de pulo falha em silêncio quando o alvo não existe: o foco
 * simplesmente não vai a lugar nenhum, e nada na tela denuncia. Por isso o teste amarra o `href`
 * ao id exportado, em vez de repetir a string.
 */
describe('CabecalhoPublico — pular para o conteúdo', () => {
  it('oferece o link de pulo apontando para o id do conteúdo principal', async () => {
    renderComRouter()

    const pulo = await screen.findByRole('link', { name: 'Pular para o conteúdo' })

    expect(pulo).toHaveAttribute('href', `#${ID_CONTEUDO_PRINCIPAL}`)
  })

  it('é o PRIMEIRO link do documento — depois do logo, já não serve para pular nada', async () => {
    const { container } = renderComRouter()

    await screen.findByRole('link', { name: 'Pular para o conteúdo' })

    const links = Array.from(container.querySelectorAll('a'))
    expect(links[0]).toHaveTextContent('Pular para o conteúdo')
  })

  it('fica fora da vista até receber foco, e aparece quando focado', async () => {
    renderComRouter()

    const pulo = await screen.findByRole('link', { name: 'Pular para o conteúdo' })

    // `sr-only` é o que o tira da vista; `focus:not-sr-only` é o que o traz de volta. Sem o
    // segundo, o link existe, é focável e continua invisível — pior que não ter.
    expect(pulo.className).toContain('sr-only')
    expect(pulo.className).toContain('focus:not-sr-only')
  })
})
