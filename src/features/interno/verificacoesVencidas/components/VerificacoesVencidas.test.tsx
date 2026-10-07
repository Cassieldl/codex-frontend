import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useParams,
} from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import {
  VERSAO_NUNCA_VERIFICADA,
  VERSAO_VERIFICADA_HA_200_DIAS,
  VERSAO_VERIFICADA_HA_90_DIAS,
  respostaListaVerificacoesVencidas,
} from '../../../../test/mocks/verificacoesVencidas'
import { VerificacoesVencidas } from './VerificacoesVencidas'

const API_URL = import.meta.env.VITE_API_URL
const URL_LISTA = `${API_URL}/interno/versoes/verificacoes-vencidas`

const TRES_VERSOES = [
  VERSAO_NUNCA_VERIFICADA,
  VERSAO_VERIFICADA_HA_90_DIAS,
  VERSAO_VERIFICADA_HA_200_DIAS,
]

type PedidoCapturado = Record<string, string>

function TelaDaVersao() {
  const { provedorId, versaoId } = useParams({ strict: false })
  return <p>{`Tela da versão ${versaoId} do provedor ${provedorId}`}</p>
}

function renderizarLista() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaInicio = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: VerificacoesVencidas,
  })
  const rotaVersao = createRoute({
    getParentRoute: () => rootRoute,
    path: '/interno/provedores/$provedorId/versoes/$versaoId',
    component: TelaDaVersao,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rotaInicio, rotaVersao]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function usarLista(items: object[]) {
  server.use(http.get(URL_LISTA, () => HttpResponse.json(respostaListaVerificacoesVencidas(items))))
}

function usarListaCapturandoPedidos(
  pedidos: PedidoCapturado[],
  extras: Partial<{ totalCount: number; totalPages: number }> = {},
) {
  server.use(
    http.get(URL_LISTA, ({ request }) => {
      pedidos.push(Object.fromEntries(new URL(request.url).searchParams))
      return HttpResponse.json(respostaListaVerificacoesVencidas(TRES_VERSOES, extras))
    }),
  )
}

async function linhasDaTabela() {
  const tabela = await screen.findByRole('table')
  return within(tabela).getAllByRole('row').slice(1)
}

function rotuloDaVersaoNaLinha(linha: HTMLElement): string {
  return within(linha).getAllByRole('link')[0].textContent ?? ''
}

describe('VerificacoesVencidas — conteúdo', () => {
  it('lista as versões na ordem recebida do servidor, sem reordenar', async () => {
    usarLista([
      VERSAO_VERIFICADA_HA_200_DIAS,
      VERSAO_NUNCA_VERIFICADA,
      VERSAO_VERIFICADA_HA_90_DIAS,
    ])

    renderizarLista()

    const linhas = await linhasDaTabela()
    expect(linhas.map(rotuloDaVersaoNaLinha)).toEqual([
      '3.1 Municipal',
      '2.0 Rascunho',
      '1.0 Contrato',
    ])
  })

  it('distingue "Nunca verificada" de "Verificada há N dias" e mostra a data em dd/MM/yyyy', async () => {
    usarLista(TRES_VERSOES)

    renderizarLista()

    const [nunca, noventa, duzentos] = await linhasDaTabela()
    expect(within(nunca).getByText('Nunca verificada')).toBeInTheDocument()
    expect(within(nunca).getByText('—')).toBeInTheDocument()
    expect(within(noventa).getByText('Verificada há 90 dias')).toBeInTheDocument()
    expect(within(noventa).getByText('07/07/2026')).toBeInTheDocument()
    expect(within(noventa).queryByText('Nunca verificada')).not.toBeInTheDocument()
    expect(within(duzentos).getByText('Verificada há 200 dias')).toBeInTheDocument()
    expect(within(duzentos).getByText('19/03/2026')).toBeInTheDocument()
  })

  it('mostra o provedor de cada versão', async () => {
    usarLista(TRES_VERSOES)

    renderizarLista()

    const [nunca, , duzentos] = await linhasDaTabela()
    expect(within(nunca).getByText('Provedor X')).toBeInTheDocument()
    expect(within(duzentos).getByText('Provedor Y')).toBeInTheDocument()
  })

  it('marca como Rascunho só a versão não publicada', async () => {
    usarLista(TRES_VERSOES)

    renderizarLista()

    const [rascunho, publicada] = await linhasDaTabela()
    expect(within(rascunho).getByText('Rascunho')).toBeInTheDocument()
    expect(within(publicada).queryByText('Rascunho')).not.toBeInTheDocument()
    expect(screen.getAllByText('Rascunho')).toHaveLength(1)
  })

  it('cada versão é um link para a sua tela interna, no endereço que o servidor informou', async () => {
    usarLista(TRES_VERSOES)

    renderizarLista()

    await linhasDaTabela()
    for (const versao of TRES_VERSOES) {
      expect(screen.getByRole('link', { name: versao.rotulo })).toHaveAttribute(
        'href',
        versao.urlInterna,
      )
    }
  })

  it('o link leva à tela da versão certa', async () => {
    const usuario = userEvent.setup()
    usarLista(TRES_VERSOES)

    renderizarLista()
    await usuario.click(await screen.findByRole('link', { name: '3.1 Municipal' }))

    expect(await screen.findByText('Tela da versão 8 do provedor 5')).toBeInTheDocument()
  })

  it('o subtítulo diz a idade mínima pedida', async () => {
    usarLista(TRES_VERSOES)

    renderizarLista()

    expect(await screen.findByText(/sem verificação há 90 dias ou mais/i)).toBeInTheDocument()
  })
})

describe('VerificacoesVencidas — estados', () => {
  it('anuncia o carregamento antes da lista chegar', async () => {
    usarLista(TRES_VERSOES)

    renderizarLista()

    expect(await screen.findByText('Carregando as verificações vencidas…')).toBeInTheDocument()
    await linhasDaTabela()
  })

  it('sem versão vencida, diz que não há nenhuma e não monta tabela', async () => {
    usarLista([])

    renderizarLista()

    expect(await screen.findByText('Nenhuma versão com verificação vencida.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('oferece nova tentativa quando a lista falha, e a tentativa recarrega', async () => {
    const usuario = userEvent.setup()
    let tentativas = 0
    server.use(
      http.get(URL_LISTA, () => {
        tentativas += 1
        return tentativas === 1
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json(respostaListaVerificacoesVencidas(TRES_VERSOES))
      }),
    )

    renderizarLista()
    await usuario.click(await screen.findByRole('button', { name: /tentar novamente/i }))

    expect(await screen.findByRole('link', { name: '1.0 Contrato' })).toBeInTheDocument()
    expect(tentativas).toBe(2)
  })
})

describe('VerificacoesVencidas — prazo e paginação', () => {
  it('pede 90 dias, página 1 e 25 por página no começo', async () => {
    const pedidos: PedidoCapturado[] = []
    usarListaCapturandoPedidos(pedidos)

    renderizarLista()
    await linhasDaTabela()

    expect(pedidos).toEqual([{ dias: '90', pagina: '1', tamanhoPagina: '25' }])
  })

  it('trocar o prazo refaz o pedido com o novo valor e volta para a primeira página', async () => {
    const usuario = userEvent.setup()
    const pedidos: PedidoCapturado[] = []
    usarListaCapturandoPedidos(pedidos, { totalCount: 60, totalPages: 3 })

    renderizarLista()
    await linhasDaTabela()
    await usuario.click(screen.getByRole('button', { name: 'Página 2' }))
    await waitFor(() => expect(pedidos.at(-1)?.pagina).toBe('2'))

    await usuario.click(screen.getByRole('combobox', { name: 'Prazo sem verificação' }))
    await usuario.click(screen.getByRole('option', { name: '180 dias' }))

    await waitFor(() =>
      expect(pedidos.at(-1)).toEqual({ dias: '180', pagina: '1', tamanhoPagina: '25' }),
    )
    expect(await screen.findByText(/sem verificação há 180 dias ou mais/i)).toBeInTheDocument()
  })

  it('navega entre páginas pedindo a página escolhida e mostra o total', async () => {
    const usuario = userEvent.setup()
    const pedidos: PedidoCapturado[] = []
    usarListaCapturandoPedidos(pedidos, { totalCount: 60, totalPages: 3 })

    renderizarLista()
    await linhasDaTabela()
    expect(screen.getByText('60 registros')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Página 3' }))

    await waitFor(() =>
      expect(pedidos.at(-1)).toEqual({ dias: '90', pagina: '3', tamanhoPagina: '25' }),
    )
  })

  it('mudar o tamanho da página volta para a primeira', async () => {
    const usuario = userEvent.setup()
    const pedidos: PedidoCapturado[] = []
    usarListaCapturandoPedidos(pedidos, { totalCount: 120, totalPages: 5 })

    renderizarLista()
    await linhasDaTabela()
    await usuario.click(screen.getByRole('button', { name: 'Página 2' }))
    await waitFor(() => expect(pedidos.at(-1)?.pagina).toBe('2'))

    await usuario.selectOptions(screen.getByLabelText('Itens por página'), '50')

    await waitFor(() =>
      expect(pedidos.at(-1)).toEqual({ dias: '90', pagina: '1', tamanhoPagina: '50' }),
    )
  })

  it('recua quando a página pedida ficou além do acervo', async () => {
    const usuario = userEvent.setup()
    const pedidos: PedidoCapturado[] = []
    server.use(
      http.get(URL_LISTA, ({ request }) => {
        const parametros = Object.fromEntries(new URL(request.url).searchParams)
        pedidos.push(parametros)
        return parametros.pagina === '1'
          ? HttpResponse.json(
              respostaListaVerificacoesVencidas(TRES_VERSOES, { totalCount: 28, totalPages: 2 }),
            )
          : HttpResponse.json(
              respostaListaVerificacoesVencidas([], { totalCount: 25, page: 2, totalPages: 1 }),
            )
      }),
    )

    renderizarLista()
    await linhasDaTabela()
    await usuario.click(screen.getByRole('button', { name: 'Página 2' }))

    await waitFor(() => expect(pedidos.at(-1)?.pagina).toBe('1'))
    expect(await screen.findByRole('link', { name: '1.0 Contrato' })).toBeInTheDocument()
    expect(screen.queryByText('Nenhuma versão com verificação vencida.')).not.toBeInTheDocument()
  })
})
