import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { routeTree } from '../routeTree.gen'

/**
 * Endereço fora de toda rota cai numa página do produto, não no aviso da
 * biblioteca.
 *
 * Sem `notFoundComponent`, o TanStack Router renderiza o próprio "Not Found":
 * em inglês, sem cabeçalho, sem navegação e sem saída. Foi o que este portal
 * fazia — descoberto ao abrir `/comunicados` no navegador, um endereço que
 * parece existir (a entidade existe na área interna) e não existe em público.
 *
 * O teste roda contra a árvore de rotas REAL (`routeTree.gen`), não contra uma
 * árvore montada à mão: uma árvore de teste teria o `notFoundComponent` que o
 * próprio teste pôs, e provaria apenas que o TanStack aceita a opção.
 */
function renderizarEndereco(endereco: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [endereco] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

/**
 * `router.load()` sobre a árvore real importa as rotas carregadas sob demanda, e o primeiro caso
 * paga a transformação de todos esses módulos. Sozinho leva ~3 s; com a suíte inteira disputando
 * CPU, passou dos 15 s do padrão e derrubou o CI de forma intermitente.
 */
const TIMEOUT_CARGA_DA_ARVORE_REAL_MS = 60_000

describe('endereço que não corresponde a rota nenhuma', () => {
  it('explica em português, dentro do layout do portal', async () => {
    renderizarEndereco('/endereco-que-nunca-existiu')

    await screen.findByRole('heading', { level: 1, name: 'Esta página não existe.' })

    // O aviso cru da biblioteca não traz nem cabeçalho nem rodapé — a presença
    // dos dois é o que distingue "página do produto" de "tela da lib".
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('nomeia a aba "Página não encontrada | Codex"', async () => {
    renderizarEndereco('/endereco-que-nunca-existiu')

    await screen.findByRole('heading', { level: 1, name: 'Esta página não existe.' })
    expect(document.title).toBe('Página não encontrada | Codex')
  })

  it('oferece saída para a busca e para o início', async () => {
    renderizarEndereco('/endereco-que-nunca-existiu')

    await screen.findByRole('heading', { level: 1, name: 'Esta página não existe.' })

    const principal = screen.getByRole('main')
    expect(principal).toHaveTextContent('Buscar no Codex')
    expect(principal).toHaveTextContent('Ir para o início')
  })

  /**
   * Sem este caso, um `notFoundComponent` que capturasse TUDO deixaria os dois
   * acima verdes com o portal inteiro quebrado.
   *
   * A verificação é sobre o casamento de rota, não sobre a tela montada: as
   * rotas reais do portal carregam sob demanda e não resolvem dentro de um
   * `render` de teste (o router fica em `pending` e o container, vazio) — é por
   * isso que os testes de tela deste projeto montam a própria árvore em vez de
   * usar a gerada. `router.load()` resolve, e é o que responde à pergunta:
   * endereço válido casa uma rota própria; só o inválido para na raiz.
   */
  it.each(['/', '/provedores', '/layout', '/artigos', '/busca'])(
    'não engole %s, que existe de verdade',
    async (endereco) => {
      const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: [endereco] }),
      })
      await router.load()

      const rotasCasadas = router.state.matches.map((casada) => casada.routeId)
      expect(rotasCasadas.filter((id) => id !== '__root__')).not.toEqual([])
    },
    TIMEOUT_CARGA_DA_ARVORE_REAL_MS,
  )

  it(
    'endereço inválido não casa nenhuma rota além da raiz',
    async () => {
      const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/endereco-que-nunca-existiu'] }),
      })
      await router.load()

      expect(router.state.matches.map((casada) => casada.routeId)).toEqual(['__root__'])
    },
    TIMEOUT_CARGA_DA_ARVORE_REAL_MS,
  )
})
