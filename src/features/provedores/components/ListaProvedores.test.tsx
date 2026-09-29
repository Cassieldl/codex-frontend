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
import type { ProvedorListaItem } from '../types/provedor'
import { ListaProvedores } from './ListaProvedores'

/**
 * Transcrito do DTO real (`ProvedorListaItemDto`), sem anotação de tipo do cliente: anotar com a
 * interface do frontend faria o compilador exigir a forma que o cliente ACREDITA, e o teste
 * confirmaria a crença em vez do contrato. Foi assim que a ausência de `versoes` passou por toda
 * a suíte e só apareceu na tela.
 */
const RESPOSTA_DO_SERVIDOR = [
  {
    slug: 'ipm-sistemas',
    nome: 'IPM Sistemas',
    categoria: 'Proprio',
    identificadorInvoicy: 'INV-IPM',
    verificadoEm: null,
    versoes: [
      { slug: '2-04', rotulo: '2.04' },
      { slug: '1-11', rotulo: '1.11' },
    ],
  },
]

function renderizar(provedores: unknown[]) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/provedores',
    component: () => <ListaProvedores provedores={provedores as ProvedorListaItem[]} />,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: ['/provedores'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('ListaProvedores', () => {
  it('monta os chips de versão a partir da resposta do servidor', async () => {
    renderizar(RESPOSTA_DO_SERVIDOR)

    expect(await screen.findByRole('link', { name: '2.04' })).toHaveAttribute(
      'href',
      '/provedores/ipm-sistemas/2-04',
    )
    expect(screen.getByRole('link', { name: '1.11' })).toBeInTheDocument()
  })

  /**
   * O campo faz parte do contrato, mas a lista é a porta de entrada do portal: se ele sumir da
   * resposta, o custo aceitável são os chips — nunca a página. Ler `versoes.slice` direto
   * derrubava a rota inteira com `Cannot read properties of undefined`.
   */
  it('sobrevive a um item sem o campo de versões, mantendo o provedor na tela', async () => {
    const semVersoes = [{ ...RESPOSTA_DO_SERVIDOR[0], versoes: undefined }]

    renderizar(semVersoes)

    expect(await screen.findByRole('link', { name: 'IPM Sistemas' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '2.04' })).not.toBeInTheDocument()
  })
})

/**
 * O texto de ausência não é uma data: prefixá-lo com "Verificado em" produzia
 * "Verificado em Ainda não verificado" na lista — enquanto a home e a página do provedor, que
 * montam a frase inteira em cada ramo, sempre estiveram certas.
 */
describe('ListaProvedores — rótulo de verificação', () => {
  it('não prefixa o texto de ausência com "Verificado em"', async () => {
    renderizar([{ ...RESPOSTA_DO_SERVIDOR[0], verificadoEm: null }])

    expect(await screen.findByText('Ainda não verificado')).toBeInTheDocument()
    expect(screen.queryByText(/Verificado em Ainda/)).not.toBeInTheDocument()
  })

  it('escreve a data quando existe verificação', async () => {
    renderizar([{ ...RESPOSTA_DO_SERVIDOR[0], verificadoEm: '2026-03-14' }])

    expect(await screen.findByText(/^Verificado em /)).toBeInTheDocument()
  })
})
