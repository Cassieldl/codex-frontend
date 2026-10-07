import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import {
  LACUNA_RECORRENTE,
  TERMO_COM_RESTO,
  TERMO_RECORRENTE,
  TERMO_SEM_CONTEXTO,
  respostaListaTermos,
} from '../../../../test/mocks/lacunasBusca'
import { server } from '../../../../test/mocks/server'
import { FilaLacunasBusca } from './FilaLacunasBusca'

const API_URL = import.meta.env.VITE_API_URL
const URL_TERMOS = `${API_URL}/interno/lacunas-busca/termos`
const URL_ESTADO_41 = `${API_URL}/interno/lacunas-busca/41/estado`
const URL_ESTADO_42 = `${API_URL}/interno/lacunas-busca/42/estado`

function renderizarFila(podeAtualizar = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return render(<FilaLacunasBusca podeAtualizar={podeAtualizar} />, { wrapper: Wrapper })
}

function usarLista(items: object[]) {
  server.use(http.get(URL_TERMOS, () => HttpResponse.json(respostaListaTermos(items))))
}

interface PedidoEstado {
  ifMatch: string | null
  corpo: Record<string, unknown>
}

function usarEstadoCapturando(
  pedidos: PedidoEstado[],
  mesmoTermoAlteradas = 2,
  urlEstado = URL_ESTADO_41,
) {
  server.use(
    http.put(urlEstado, async ({ request }) => {
      pedidos.push({
        ifMatch: request.headers.get('If-Match'),
        corpo: (await request.json()) as Record<string, unknown>,
      })
      return HttpResponse.json({
        data: {
          lacuna: { ...LACUNA_RECORRENTE, estado: 'Resolvida', versaoConcorrencia: 8 },
          mesmoTermoAlteradas,
        },
      })
    }),
  )
}

describe('FilaLacunasBusca — leitura', () => {
  it('consulta o endpoint agrupado, só as abertas, das mais recorrentes para as menos', async () => {
    const capturado: { params: Record<string, string> | null } = { params: null }
    server.use(
      http.get(URL_TERMOS, ({ request }) => {
        capturado.params = Object.fromEntries(new URL(request.url).searchParams)
        return HttpResponse.json(respostaListaTermos([TERMO_RECORRENTE]))
      }),
    )

    renderizarFila()
    await screen.findByText('E0117 ipm')

    expect(capturado.params).toEqual({
      estado: 'Aberta',
      sortBy: 'ocorrencias',
      sortDirection: 'desc',
      pagina: '1',
      tamanhoPagina: '25',
    })
  })

  it('mostra uma linha por termo, com ocorrências, parceiros, chamados, datas e último registro', async () => {
    usarLista([TERMO_RECORRENTE, TERMO_SEM_CONTEXTO])

    renderizarFila()

    const linha = await screen.findByRole('row', { name: /E0117 ipm/ })
    expect(within(linha).getByText('3 ocorrências')).toBeInTheDocument()
    expect(within(linha).getByText('Prefeitura de Exemplo, Prefeitura Vizinha')).toBeInTheDocument()
    expect(within(linha).getByText('4521, 4400')).toBeInTheDocument()
    const celulas = within(linha).getAllByRole('cell')
    expect(celulas[4]).toHaveTextContent('01/10/2026')
    expect(celulas[5]).toHaveTextContent('05/10/2026')
    expect(within(linha).getByText('Maria Souza')).toBeInTheDocument()
    // Cabeçalho + uma linha por termo: o mesmo termo não se repete.
    expect(screen.getAllByRole('row')).toHaveLength(3)
  })

  it('sem parceiro, chamado ou nome, a linha mostra traço e que o nome não foi informado', async () => {
    usarLista([TERMO_SEM_CONTEXTO])

    renderizarFila()

    const linha = await screen.findByRole('row', { name: /cancelamento fora do prazo/ })
    expect(within(linha).getByText('1 ocorrência')).toBeInTheDocument()
    expect(within(linha).getByText('Nome não informado')).toBeInTheDocument()
    expect(within(linha).getAllByText('—')).toHaveLength(2)
    expect(within(linha).queryByText(/^\+\d+$/)).not.toBeInTheDocument()
  })

  it('mostra "+N" quando o total de distintos passa da lista devolvida, em parceiros e em chamados', async () => {
    usarLista([TERMO_COM_RESTO])

    renderizarFila()

    const linha = await screen.findByRole('row', { name: /rejeição genérica/ })
    // 14 parceiros e 12 chamados no total; o servidor devolveu 10 de cada.
    expect(within(linha).getByText('+4')).toBeInTheDocument()
    expect(within(linha).getByText('+2')).toBeInTheDocument()
    expect(within(linha).getByText(/^Parceiro 14, Parceiro 13,/)).toBeInTheDocument()
  })

  it('não mostra "+N" quando a lista devolvida já tem todos os distintos', async () => {
    usarLista([TERMO_RECORRENTE])

    renderizarFila()

    const linha = await screen.findByRole('row', { name: /E0117 ipm/ })
    expect(within(linha).queryByText(/^\+\d+$/)).not.toBeInTheDocument()
  })

  it('anuncia o carregamento antes de a fila chegar', async () => {
    usarLista([TERMO_RECORRENTE])

    renderizarFila()

    expect(screen.getByText('Carregando a fila…')).toBeInTheDocument()
    await screen.findByText('E0117 ipm')
  })

  it('fila vazia explica como ela se enche', async () => {
    usarLista([])

    renderizarFila()

    expect(await screen.findByText(/nenhuma lacuna aberta/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('oferece nova tentativa quando a fila falha, e a tentativa recarrega', async () => {
    const usuario = userEvent.setup()
    let tentativas = 0
    server.use(
      http.get(URL_TERMOS, () => {
        tentativas += 1
        return tentativas === 1
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json(respostaListaTermos([TERMO_RECORRENTE]))
      }),
    )

    renderizarFila()
    await usuario.click(await screen.findByRole('button', { name: /tentar novamente/i }))

    expect(await screen.findByText('E0117 ipm')).toBeInTheDocument()
  })

  it('sem permissão de atualizar a fila só se lê: nenhuma ação, nenhuma coluna de ações', async () => {
    usarLista([TERMO_RECORRENTE])

    renderizarFila(false)
    await screen.findByText('E0117 ipm')

    expect(screen.queryByRole('button', { name: /resolver termo/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /descartar termo/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Ações' })).not.toBeInTheDocument()
  })

  it('pagina por grupos: pede a página escolhida e mostra os termos dela', async () => {
    const usuario = userEvent.setup()
    const paginasPedidas: string[] = []
    server.use(
      http.get(URL_TERMOS, ({ request }) => {
        const pagina = new URL(request.url).searchParams.get('pagina') ?? ''
        paginasPedidas.push(pagina)

        return pagina === '2'
          ? HttpResponse.json(
              respostaListaTermos([TERMO_SEM_CONTEXTO], { totalCount: 26, page: 2, totalPages: 2 }),
            )
          : HttpResponse.json(
              respostaListaTermos([TERMO_RECORRENTE], { totalCount: 26, totalPages: 2 }),
            )
      }),
    )

    renderizarFila()
    await screen.findByText('E0117 ipm')
    await usuario.click(screen.getByRole('button', { name: 'Página 2' }))

    expect(await screen.findByText('cancelamento fora do prazo')).toBeInTheDocument()
    expect(paginasPedidas).toEqual(['1', '2'])
  })

  it('trocar o tamanho da página volta para a primeira página', async () => {
    const usuario = userEvent.setup()
    const pedidos: Record<string, string>[] = []
    server.use(
      http.get(URL_TERMOS, ({ request }) => {
        pedidos.push(Object.fromEntries(new URL(request.url).searchParams))
        return HttpResponse.json(
          respostaListaTermos([TERMO_RECORRENTE], { totalCount: 80, totalPages: 4 }),
        )
      }),
    )

    renderizarFila()
    await screen.findByText('E0117 ipm')
    await usuario.click(screen.getByRole('button', { name: 'Página 2' }))
    await waitFor(() => expect(pedidos.at(-1)?.pagina).toBe('2'))
    await usuario.selectOptions(screen.getByLabelText('Itens por página'), '50')

    await waitFor(() => expect(pedidos.at(-1)).toMatchObject({ pagina: '1', tamanhoPagina: '50' }))
  })

  it('resolver o último termo da última página recua para a página que ainda tem registros', async () => {
    const usuario = userEvent.setup()
    const paginasPedidas: string[] = []
    server.use(
      http.get(URL_TERMOS, ({ request }) => {
        const pagina = new URL(request.url).searchParams.get('pagina') ?? ''
        paginasPedidas.push(pagina)

        if (pagina === '2') {
          return HttpResponse.json(
            respostaListaTermos([], { totalCount: 25, page: 2, totalPages: 1 }),
          )
        }
        return HttpResponse.json(
          respostaListaTermos([TERMO_RECORRENTE], { totalCount: 26, totalPages: 2 }),
        )
      }),
    )

    renderizarFila()
    await screen.findByText('E0117 ipm')
    await usuario.click(screen.getByRole('button', { name: 'Página 2' }))

    await waitFor(() => expect(paginasPedidas).toEqual(['1', '2', '1']))
    expect(await screen.findByText('E0117 ipm')).toBeInTheDocument()
  })
})

describe('FilaLacunasBusca — resolver e descartar o termo', () => {
  it('resolver envia a ocorrência de referência, o If-Match do termo e incluirMesmoTermo true', async () => {
    const usuario = userEvent.setup()
    const pedidos: PedidoEstado[] = []
    usarLista([TERMO_RECORRENTE])
    usarEstadoCapturando(pedidos)

    renderizarFila()
    await usuario.click(await screen.findByRole('button', { name: 'Resolver termo E0117 ipm' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Resolver termo' })
    await usuario.type(within(dialogo).getByLabelText('Nota (opcional)'), '  Artigo publicado ')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Resolver' }))

    expect(await screen.findByText('3 ocorrências de "E0117 ipm" resolvidas.')).toBeInTheDocument()
    expect(pedidos).toEqual([
      {
        ifMatch: 'W/"7"',
        corpo: { estado: 'Resolvida', nota: 'Artigo publicado', incluirMesmoTermo: true },
      },
    ])
  })

  it('descartar envia Descartada, omite a nota em branco e vale para o termo todo', async () => {
    const usuario = userEvent.setup()
    const pedidos: PedidoEstado[] = []
    usarLista([TERMO_RECORRENTE])
    usarEstadoCapturando(pedidos, 2)

    renderizarFila()
    await usuario.click(await screen.findByRole('button', { name: 'Descartar termo E0117 ipm' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Descartar termo' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Descartar' }))

    await screen.findByText('3 ocorrências de "E0117 ipm" descartadas.')
    expect(pedidos[0].corpo).toEqual({ estado: 'Descartada', incluirMesmoTermo: true })
    expect('nota' in pedidos[0].corpo).toBe(false)
  })

  it('termo de uma ocorrência só também vai com incluirMesmoTermo true, e o aviso fica no singular', async () => {
    const usuario = userEvent.setup()
    const pedidos: PedidoEstado[] = []
    usarLista([TERMO_SEM_CONTEXTO])
    usarEstadoCapturando(pedidos, 0, URL_ESTADO_42)

    renderizarFila()
    await usuario.click(
      await screen.findByRole('button', { name: 'Resolver termo cancelamento fora do prazo' }),
    )
    const dialogo = await screen.findByRole('dialog', { name: 'Resolver termo' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Resolver' }))

    expect(
      await screen.findByText('Termo "cancelamento fora do prazo" resolvido.'),
    ).toBeInTheDocument()
    expect(pedidos).toEqual([
      { ifMatch: 'W/"2"', corpo: { estado: 'Resolvida', incluirMesmoTermo: true } },
    ])
  })

  it('o diálogo diz que a decisão vale para todas as ocorrências e não oferece escolha', async () => {
    const usuario = userEvent.setup()
    usarLista([TERMO_RECORRENTE])

    renderizarFila()
    await usuario.click(await screen.findByRole('button', { name: 'Resolver termo E0117 ipm' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Resolver termo' })
    expect(
      within(dialogo).getByText('Vale para as 3 ocorrências abertas deste termo.'),
    ).toBeInTheDocument()
    expect(within(dialogo).queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('com uma ocorrência o diálogo fala no singular', async () => {
    const usuario = userEvent.setup()
    usarLista([TERMO_SEM_CONTEXTO])

    renderizarFila()
    await usuario.click(
      await screen.findByRole('button', { name: 'Resolver termo cancelamento fora do prazo' }),
    )

    const dialogo = await screen.findByRole('dialog', { name: 'Resolver termo' })
    expect(
      within(dialogo).getByText('Vale para a ocorrência aberta deste termo.'),
    ).toBeInTheDocument()
  })

  it('nota acima de 500 caracteres é recusada no diálogo, sem chamar o servidor', async () => {
    const usuario = userEvent.setup()
    const pedidos: PedidoEstado[] = []
    usarLista([TERMO_RECORRENTE])
    usarEstadoCapturando(pedidos)

    renderizarFila()
    await usuario.click(await screen.findByRole('button', { name: 'Resolver termo E0117 ipm' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Resolver termo' })
    await usuario.click(within(dialogo).getByLabelText('Nota (opcional)'))
    await usuario.paste('a'.repeat(501))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Resolver' }))

    expect(await within(dialogo).findByText('Máximo de 500 caracteres.')).toBeInTheDocument()
    expect(pedidos).toHaveLength(0)
  })

  it('409 fecha o diálogo, explica o conflito e recarrega a fila', async () => {
    const usuario = userEvent.setup()
    let leituras = 0
    server.use(
      http.get(URL_TERMOS, () => {
        leituras += 1
        return HttpResponse.json(respostaListaTermos([TERMO_RECORRENTE]))
      }),
      http.put(URL_ESTADO_41, () =>
        HttpResponse.json(
          {
            error: {
              code: 'CONFLITO_CONCORRENCIA',
              message: 'O recurso foi alterado por outra requisição enquanto você editava.',
            },
          },
          { status: 409 },
        ),
      ),
    )

    renderizarFila()
    await usuario.click(await screen.findByRole('button', { name: 'Resolver termo E0117 ipm' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Resolver termo' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Resolver' }))

    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent('O recurso foi alterado por outra requisição')
    expect(aviso).toHaveTextContent('A fila foi recarregada')
    await waitFor(() => expect(leituras).toBe(2))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each([
    ['422 VALIDACAO_NEGOCIO', 422, 'VALIDACAO_NEGOCIO'],
    ['400 IF_MATCH_OBRIGATORIO', 400, 'IF_MATCH_OBRIGATORIO'],
  ])('%s fecha o diálogo, avisa e recarrega a fila', async (_nome, status, code) => {
    const usuario = userEvent.setup()
    let leituras = 0
    server.use(
      http.get(URL_TERMOS, () => {
        leituras += 1
        return HttpResponse.json(respostaListaTermos([TERMO_RECORRENTE]))
      }),
      http.put(URL_ESTADO_41, () =>
        HttpResponse.json({ error: { code, message: 'A linha mudou.' } }, { status }),
      ),
    )

    renderizarFila()
    await usuario.click(await screen.findByRole('button', { name: 'Resolver termo E0117 ipm' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Resolver termo' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Resolver' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A fila foi recarregada')
    await waitFor(() => expect(leituras).toBe(2))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('erro que não é de linha velha mantém o diálogo aberto com o motivo', async () => {
    const usuario = userEvent.setup()
    server.use(
      http.get(URL_TERMOS, () => HttpResponse.json(respostaListaTermos([TERMO_RECORRENTE]))),
      http.put(URL_ESTADO_41, () =>
        HttpResponse.json(
          { error: { code: 'ACESSO_NEGADO', message: 'Sem permissão para esta ação.' } },
          { status: 403 },
        ),
      ),
    )

    renderizarFila()
    await usuario.click(await screen.findByRole('button', { name: 'Resolver termo E0117 ipm' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Resolver termo' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Resolver' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Sem permissão para esta ação.',
    )
    expect(screen.getByRole('dialog', { name: 'Resolver termo' })).toBeInTheDocument()
  })
})
