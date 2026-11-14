import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import type { GrupoResultado, ResultadoItem } from '../types/resultadoBusca'
import { GrupoResultadoLista } from './GrupoResultadoLista'

const API_URL = import.meta.env.VITE_API_URL

const SOLUCAO_E157_ISSNET =
  'Pedir liberação à Nota Control (homologação paga; produção por e-mail a suporte@notaeletronica.com.br).'

// Valores do item do ISS.NET em GET /api/v1/busca?q=E157 no banco local, inclusive o trecho.
function criarItem(sobrescritas: Partial<ResultadoItem> = {}): ResultadoItem {
  return {
    tipo: 'erro',
    rotulo: 'Erro',
    chave: 'E157',
    titulo: 'Usuário não está autorizado a utilizar esse serviço para esse contribuinte.',
    url: '/erros/e157-issnet',
    provedorNome: 'ISS.NET',
    versaoRotulo: '1.01',
    versoes: null,
    descricaoCasamento: 'casou com o código E157',
    solucaoResumo: SOLUCAO_E157_ISSNET,
    publicado: true,
    meta: null,
    pontuacao: 1,
    trechos: [
      { texto: 'E157', destacado: true },
      {
        texto:
          ' Usuário não está autorizado a utilizar esse serviço para esse contribuinte. Usuário não está autorizado a utilizar esse serviço para esse contribuinte. Pedir liberação à Nota Control (homologação paga; produção por e-mail',
        destacado: false,
      },
    ],
    ...sobrescritas,
  }
}

function criarGrupo(itens: ResultadoItem[], total = itens.length): GrupoResultado {
  return { tipo: 'erro', rotulo: 'Erros conhecidos', total, pontuacao: 1, itens }
}

// JSON literal transcrito de BuscaItemDto, sem o tipo do cliente: vai para o MSW.
function itensNumerados(quantidade: number, inicio = 0) {
  return Array.from({ length: quantidade }, (_, indice) => {
    const numero = inicio + indice + 1
    return {
      tipo: 'erro',
      rotulo: 'Erro',
      chave: `E${numero}`,
      titulo: `Mensagem do erro ${numero}`,
      url: `/erros/e${numero}`,
      provedorNome: 'GISS',
      versaoRotulo: '2.04',
      versoes: null,
      descricaoCasamento: 'casou com o termo pesquisado',
      solucaoResumo: null,
      publicado: true,
      meta: null,
      pontuacao: 1,
      trechos: [],
    }
  })
}

// O cartão monta `<Link>` do TanStack Router e o grupo pagina pelo TanStack Query.
function renderComRouter(grupo: GrupoResultado) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pagina',
    component: () => <GrupoResultadoLista grupo={grupo} parametros={{ q: 'aliquota' }} />,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: ['/pagina'] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('GrupoResultadoLista: cartão de erro', () => {
  it('mostra código, provedor e a linha de solução, sem "casou com"', async () => {
    renderComRouter(criarGrupo([criarItem()]))

    const cartao = await screen.findByRole('link')
    expect(within(cartao).getByText('E157')).toBeInTheDocument()
    expect(within(cartao).getByText('ISS.NET · 1.01')).toBeInTheDocument()
    expect(cartao).toHaveTextContent(`Solução: ${SOLUCAO_E157_ISSNET}`)
    expect(cartao).not.toHaveTextContent('casou com')
  })

  it('sem solução documentada, diz isso em vez de esconder a linha', async () => {
    renderComRouter(criarGrupo([criarItem({ solucaoResumo: null })]))

    expect(await screen.findByRole('link')).toHaveTextContent('Solução: ainda não documentada')
  })

  it('mensagem e solução aparecem uma vez: o trecho que só repete o cartão sai', async () => {
    renderComRouter(criarGrupo([criarItem()]))

    const cartao = await screen.findByRole('link')
    expect(cartao.textContent?.match(/Usuário não está autorizado/g)).toHaveLength(1)
    expect(cartao.textContent?.match(/Pedir liberação/g)).toHaveLength(1)
    expect(cartao.textContent?.match(/E157/g)).toHaveLength(1)
  })

  it('o trecho que acrescenta algo fica, com o termo destacado', async () => {
    renderComRouter(
      criarGrupo([
        criarItem({
          trechos: [
            { texto: 'Informe a ', destacado: false },
            { texto: 'alíquota', destacado: true },
            { texto: ' do município.', destacado: false },
          ],
        }),
      ]),
    )

    const cartao = await screen.findByRole('link')
    expect(within(cartao).getByText('alíquota').tagName).toBe('MARK')
  })

  it('título cortado em "…": a frase do trecho vira o título, com o termo destacado, e não se repete', async () => {
    renderComRouter(
      criarGrupo([
        criarItem({
          chave: 'E0621',
          titulo:
            'É obrigatório informar alíquota quando há indicação de retenção do ISSQN (tpRetISSQN = 2 ou 3) para o prestador de serviço ME/EPP (opSimpNac = 3) na data de…',
          solucaoResumo: null,
          trechos: [
            { texto: 'E0621 É obrigatório informar ', destacado: false },
            { texto: 'alíquota', destacado: true },
            {
              texto:
                ' quando há indicação de retenção do ISSQN (tpRetISSQN = 2 ou 3) para o prestador de serviço ME/EPP (opSimpNac = 3) na data de competência informada na DPS, com apuração',
              destacado: false,
            },
          ],
        }),
      ]),
    )

    const cartao = await screen.findByRole('link')
    expect(cartao.textContent?.match(/É obrigatório informar/g)).toHaveLength(1)
    expect(cartao).toHaveTextContent('na DPS, com apuração…')
    expect(within(cartao).getByText('alíquota').tagName).toBe('MARK')
  })

  it('o cabeçalho do grupo tem só o rótulo e o total', async () => {
    renderComRouter(criarGrupo([criarItem()]))

    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent(
      'Erros conhecidos (1)',
    )
  })
})

// jsdom não faz layout: a medida em 390 px fica com o navegador. Aqui se trava a regra que a
// produz, porque um caminho XML sem espaço não tem onde quebrar e empurra a linha para fora.
describe('GrupoResultadoLista: texto longo sem espaço no celular', () => {
  const caminhoXml = 'NFSe/infNFSe/DPS/infDPS/prest/regTrib/regEspTrib'

  it('o título quebra onde precisar e encolhe ao lado do provedor', async () => {
    renderComRouter(
      criarGrupo([
        criarItem({ titulo: caminhoXml, provedorNome: 'Emissor Nacional', versaoRotulo: '0.20' }),
      ]),
    )

    const classes = (await screen.findByText(caminhoXml)).className.split(/\s+/)

    expect(classes).toContain('min-w-0')
    expect(classes).toContain('[overflow-wrap:anywhere]')
  })

  it('o trecho também quebra, e a quebra fica só nos textos longos, nunca no cartão inteiro', async () => {
    renderComRouter(criarGrupo([criarItem({ trechos: [{ texto: caminhoXml, destacado: false }] })]))

    const trecho = await screen.findByText(caminhoXml)
    expect(trecho.className.split(/\s+/)).toContain('[overflow-wrap:anywhere]')
    expect(screen.getByRole('link').className).not.toContain('overflow-wrap')
  })
})

describe('GrupoResultadoLista: paginação do grupo', () => {
  function servirPaginas(total: number, registrarPedido: (url: URL) => void = () => undefined) {
    server.use(
      http.get(`${API_URL}/busca`, ({ request }) => {
        const url = new URL(request.url)
        registrarPedido(url)
        const pagina = Number(url.searchParams.get('pagina'))
        const tamanho = Number(url.searchParams.get('tamanhoPagina'))
        const inicio = (pagina - 1) * tamanho
        const itens = itensNumerados(Math.max(0, Math.min(tamanho, total - inicio)), inicio)

        return HttpResponse.json({
          data: {
            termo: 'aliquota',
            termoUsado: 'aliquota',
            correcao: null,
            qualidade: 'exata',
            totalGeral: total,
            grupos: [{ tipo: 'erro', rotulo: 'Erros conhecidos', total, pontuacao: 1, itens }],
            foraDoFiltro: null,
            filtroProvedor: null,
          },
          message: null,
        })
      }),
    )
  }

  // Tempo de sobra para o pedido sair se o grupo o disparasse ao montar.
  function esperarPedidosPendentes() {
    return new Promise((resolver) => setTimeout(resolver, 150))
  }

  it('grupo incompleto não pede nada ao montar; só depois de "Ver todos" pede as páginas e chega ao último', async () => {
    const pedidos: URL[] = []
    servirPaginas(81, (url) => pedidos.push(url))

    renderComRouter(criarGrupo(itensNumerados(17), 81))

    const verTodos = await screen.findByRole('button', {
      name: 'Ver os 81 erros conhecidos',
    })
    await esperarPedidosPendentes()
    expect(pedidos).toHaveLength(0)
    expect(screen.getByText('Mensagem do erro 17')).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()

    fireEvent.click(verTodos)

    expect(await screen.findByText('Mensagem do erro 25')).toBeInTheDocument()
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0]?.searchParams.get('tipo')).toBe('erro')
    expect(pedidos[0]?.searchParams.get('q')).toBe('aliquota')
    expect(pedidos[0]?.searchParams.get('pagina')).toBe('1')
    expect(screen.queryByRole('button', { name: /Ver os/ })).not.toBeInTheDocument()

    const paginacao = screen.getByRole('navigation', { name: 'Páginas de Erros conhecidos' })
    fireEvent.click(within(paginacao).getByRole('button', { name: 'Página 4' }))

    expect(await screen.findByText('Mensagem do erro 81')).toBeInTheDocument()
    expect(screen.getByText('Mensagem do erro 76')).toBeInTheDocument()
    expect(screen.queryByText('Mensagem do erro 25')).not.toBeInTheDocument()
    expect(pedidos.at(-1)?.searchParams.get('pagina')).toBe('4')
  })

  it('falha ao carregar a página fica contida no grupo, sem apagar o que já veio, com tentar de novo', async () => {
    server.use(http.get(`${API_URL}/busca`, () => HttpResponse.json({}, { status: 500 })))

    renderComRouter(criarGrupo(itensNumerados(17), 81))
    fireEvent.click(await screen.findByRole('button', { name: 'Ver os 81 erros conhecidos' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível carregar esta página de resultados.')
    expect(within(alerta).getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    expect(screen.getByText('Mensagem do erro 17')).toBeInTheDocument()
  })

  it('grupo que já veio inteiro não pede nada nem mostra paginação', async () => {
    renderComRouter(criarGrupo(itensNumerados(3), 3))

    expect(await screen.findByText('Mensagem do erro 3')).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ver os/ })).not.toBeInTheDocument()
  })
})
