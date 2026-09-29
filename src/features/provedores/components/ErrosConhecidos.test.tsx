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
import { ErrosConhecidos } from './ErrosConhecidos'

/**
 * Transcrito do `ErroResumoPublicoDto` real, **sem anotação do tipo do cliente**: anotar faria o
 * compilador moldar o mock à crença do cliente, e o teste passaria a conferir a si mesmo. O
 * detector de que o servidor cumpre este shape vive no backend
 * (`MensagensDoErroNaPaginaVersaoHttpTests`).
 */
const RESUMO_DO_SERVIDOR = {
  total: 2,
  itens: [
    {
      codigo: 'E-1023',
      titulo: 'Inscrição municipal do prestador não encontrada',
      url: '/erros/e-1023-inscricao-municipal-do-prestador-nao-encontrada',
      variantes: [
        'Inscrição municipal inválida ou não cadastrada',
        'Prestador não localizado no cadastro mobiliário',
      ],
    },
    {
      codigo: 'E-2145',
      titulo: 'ISS retido informado sem o CNPJ do tomador',
      url: '/erros/e-2145-iss-retido-informado-sem-o-cnpj-do-tomador',
      variantes: [],
    },
  ],
}

// `<Link>` do TanStack exige um router montado; os destinos não precisam existir
// para o `href` resolver (mesmo padrão de `provedor-layout.test.tsx`).
function renderizar(resumo: typeof RESUMO_DO_SERVIDOR) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <ErrosConhecidos resumo={resumo} provedorSlug="prefeitura-exemplo" />,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('ErrosConhecidos', () => {
  /**
   * O caso que motivou a mudança: quem abre esta página tem em mãos o texto que a prefeitura
   * devolveu, não o código nem o título que damos a ele. Enquanto a lista mostrava só `E-1023` e
   * o título, ela respondia apenas a quem já sabia o código.
   */
  it('mostra as mensagens observadas junto do erro', async () => {
    renderizar(RESUMO_DO_SERVIDOR)

    await screen.findByRole('heading', { name: 'Erros conhecidos' })

    expect(screen.getByText('Inscrição municipal inválida ou não cadastrada')).toBeInTheDocument()
    expect(screen.getByText('Prestador não localizado no cadastro mobiliário')).toBeInTheDocument()
  })

  it('mostra código e título de cada erro', async () => {
    renderizar(RESUMO_DO_SERVIDOR)

    await screen.findByRole('heading', { name: 'Erros conhecidos' })

    expect(screen.getByText('E-1023')).toBeInTheDocument()
    expect(screen.getByText('Inscrição municipal do prestador não encontrada')).toBeInTheDocument()
  })

  /**
   * Erro sem variante registrada é caso normal (U9), não defeito: o item continua na lista, só
   * sem o bloco de mensagens. Sem este caso, uma implementação que exigisse variante passaria.
   */
  it('mostra o erro sem mensagens quando ele ainda não tem variante', async () => {
    renderizar(RESUMO_DO_SERVIDOR)

    await screen.findByRole('heading', { name: 'Erros conhecidos' })

    const semVariante = screen.getByText('ISS retido informado sem o CNPJ do tomador')
    expect(semVariante).toBeInTheDocument()
    // O item existe e não arrasta lista de mensagens vazia junto.
    expect(semVariante.closest('li')?.querySelectorAll('ul li')).toHaveLength(0)
  })

  it('não renderiza a seção quando não há erro nenhum', () => {
    const { container } = renderizar({ total: 0, itens: [] })

    expect(container.querySelector('section')).toBeNull()
  })
})
