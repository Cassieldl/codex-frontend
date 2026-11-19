import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { grupoDoCampo } from './grupoDoCampo'
import { ReferenciasCruzadas } from './ReferenciasCruzadas'

// Transcrito da resposta real de GET /api/v1/artigos/{slug} — sem anotação de tipo do cliente,
// para o compilador não forçar o mock a ter a forma que a tela acredita.
const campoNaRaiz = {
  rotulo: 'CAMPO DO LAYOUT',
  slug: 'tpsusp',
  nome: 'tpSusp',
  caminhoXml: '//tpSusp',
  significado: 'Opção para Exigibilidade suspensa.',
  url: '/layout/campos/tpsusp',
} as const

const campoEmGrupo = {
  rotulo: 'CAMPO DO LAYOUT',
  slug: 'servico-valores-valaliqiss',
  nome: 'ValAliqISS',
  caminhoXml: '//Servico/Valores/ValAliqISS',
  significado: 'Alíquota do ISS.',
  url: '/layout/campos/servico-valores-valaliqiss',
} as const

const erro = {
  rotulo: 'REJEIÇÃO',
  slug: 'e1300-nao-e-permitido-informar-aliquota-aplicada-superior-a-5',
  codigo: 'E1300',
  titulo: 'Não é permitido informar alíquota aplicada superior a 5%.',
  url: '/erros/e1300-nao-e-permitido-informar-aliquota-aplicada-superior-a-5',
} as const

function renderComRouter(elemento: React.ReactNode) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotas = [
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/pagina',
      component: () => <>{elemento}</>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/erros/$erroSlug',
      component: () => null,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/layout/campos/$campoSlug',
      component: () => null,
    }),
  ]
  const router = createRouter({
    routeTree: rootRoute.addChildren(rotas),
    history: createMemoryHistory({ initialEntries: ['/pagina'] }),
  })

  return render(<RouterProvider router={router} />)
}

async function renderCampos() {
  renderComRouter(<ReferenciasCruzadas camposLayout={[campoNaRaiz, campoEmGrupo]} erros={[]} />)
  return {
    tagRaiz: await screen.findByRole('button', { name: /tpSusp/ }),
    tagGrupo: screen.getByRole('button', { name: /ValAliqISS/ }),
  }
}

describe('grupoDoCampo', () => {
  it('devolve o grupo do caminho, ou null quando o campo fica na raiz', () => {
    expect(grupoDoCampo('//Servico/Valores/ValAliqISS')).toBe('Servico/Valores')
    expect(grupoDoCampo('//tpSusp')).toBeNull()
  })
})

describe('ReferenciasCruzadas — campos do Layout InvoiCy', () => {
  it('campo na raiz mostra só o nome; o campo dentro de um grupo mostra o grupo antes', async () => {
    const { tagRaiz, tagGrupo } = await renderCampos()

    expect(tagRaiz).toHaveTextContent(/^tpSusp$/)
    expect(tagGrupo).toHaveTextContent(/^Servico\/Valores\/ValAliqISS$/)
    expect(screen.queryByText('//tpSusp')).not.toBeInTheDocument()
  })

  it('não repete em cada item o rótulo que o título da seção já diz', async () => {
    await renderCampos()

    expect(screen.queryByText('CAMPO DO LAYOUT')).not.toBeInTheDocument()
  })

  it('abrir a tag mostra o significado e o link para a página do campo', async () => {
    const { tagRaiz } = await renderCampos()
    expect(screen.queryByText(campoNaRaiz.significado)).not.toBeInTheDocument()

    fireEvent.click(tagRaiz)

    expect(tagRaiz).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(campoNaRaiz.significado)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver no Layout InvoiCy' })).toHaveAttribute(
      'href',
      '/layout/campos/tpsusp',
    )
    expect(screen.queryByText(/Dentro do grupo/)).not.toBeInTheDocument()
  })

  it('campo dentro de um grupo diz o grupo no detalhe', async () => {
    const { tagGrupo } = await renderCampos()

    fireEvent.click(tagGrupo)

    expect(screen.getByText(/Dentro do grupo/)).toHaveTextContent('Dentro do grupo Servico/Valores')
  })

  it('só um detalhe aberto por vez; clicar de novo fecha', async () => {
    const { tagRaiz, tagGrupo } = await renderCampos()

    fireEvent.click(tagRaiz)
    fireEvent.click(tagGrupo)

    expect(
      screen
        .getAllByRole('button')
        .filter((botao) => botao.getAttribute('aria-expanded') === 'true'),
    ).toEqual([tagGrupo])
    expect(screen.queryByText(campoNaRaiz.significado)).not.toBeInTheDocument()

    fireEvent.click(tagGrupo)
    expect(tagGrupo).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(campoEmGrupo.significado)).not.toBeInTheDocument()
  })

  it('Esc fecha o detalhe e devolve o foco à tag', async () => {
    const { tagRaiz } = await renderCampos()
    fireEvent.click(tagRaiz)

    fireEvent.keyDown(screen.getByRole('link', { name: 'Ver no Layout InvoiCy' }), {
      key: 'Escape',
    })

    expect(tagRaiz).toHaveAttribute('aria-expanded', 'false')
    expect(tagRaiz).toHaveFocus()
  })

  it('as tags apontam para um painel que existe mesmo fechado', async () => {
    const { tagRaiz } = await renderCampos()

    expect(document.getElementById(tagRaiz.getAttribute('aria-controls') ?? '')).not.toBeNull()
  })
})

describe('ReferenciasCruzadas — rejeições relacionadas', () => {
  it('cada rejeição é uma linha com código e título, ligando à página do erro', async () => {
    renderComRouter(<ReferenciasCruzadas camposLayout={[]} erros={[erro]} />)

    const link = await screen.findByRole('link', { name: /E1300\s*Não é permitido/ })
    expect(link).toHaveAttribute('href', erro.url)
    expect(screen.queryByText('REJEIÇÃO')).not.toBeInTheDocument()
  })

  it('seção vazia não renderiza <h2> órfão', async () => {
    renderComRouter(<ReferenciasCruzadas camposLayout={[campoNaRaiz]} erros={[]} />)

    expect(
      await screen.findByRole('heading', { name: 'Campos do Layout InvoiCy' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Rejeições relacionadas' }),
    ).not.toBeInTheDocument()
  })

  it('sem nenhuma referência, não renderiza nada', () => {
    const { container } = render(<ReferenciasCruzadas camposLayout={[]} erros={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
