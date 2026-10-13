import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ID_SECAO_REJEICOES, RejeicoesDoCampo } from './RejeicoesDoCampo'

/**
 * Transcritos da resposta real de `GET /provedores/emissor-nacional/versoes/0-20` (campo
 * `PaiPreServico`), **sem anotação do tipo do cliente**. E0304 tem a mensagem igual ao título;
 * E0590 e E0591 têm o título truncado com `…` e a mensagem completa.
 */
const ERRO_COM_MENSAGEM_IGUAL = {
  slug: 'e0304-informe-um-codigo-de-pais-existente-diferente-de-brasil-br-conforme-tabela-de-pais-iso2',
  codigo: 'E0304',
  titulo:
    'Informe um código de país existente diferente de Brasil (BR), conforme tabela de país ISO2.',
  variantes: [
    'Informe um código de país existente diferente de Brasil (BR), conforme tabela de país ISO2.',
  ],
}

const ERRO_COM_MENSAGEM_PROPRIA = {
  slug: 'e0590-e-obrigatorio-informar-o-codigo-do-pais-onde-ocorreu-o-resultado-do-servico-prestado-para-os-cenarios-2-30-58-62-72-76-conforme-a-planilha',
  codigo: 'E0590',
  titulo:
    'É obrigatório informar o código do país onde ocorreu o resultado do serviço prestado para os cenários 2, 30, 58, 62, 72, 76, conforme a planilha…',
  variantes: [
    'É obrigatório informar o código do país onde ocorreu o resultado do serviço prestado para os cenários 2, 30, 58, 62, 72, 76, conforme a planilha "EXPORTACAO_EMISSÃO_NFS-e".',
  ],
}

const ERRO_PROIBIDO_FORA_DO_CENARIO = {
  slug: 'e0591-nao-e-permitido-informar-o-codigo-do-pais-onde-ocorreu-o-resultado-do-servico-prestado-para-os-cenarios-diferentes-de-2-30-58-62-72-76-conforme-a',
  codigo: 'E0591',
  titulo:
    'Não é permitido informar o código do país onde ocorreu o resultado do serviço prestado para os cenários diferentes de 2, 30, 58, 62, 72, 76 conforme a…',
  variantes: [
    'Não é permitido informar o código do país onde ocorreu o resultado do serviço prestado para os cenários diferentes de 2, 30, 58, 62, 72, 76 conforme a planilha "EXPORTACAO_EMISSÃO_NFS-e".',
  ],
}

/** Ordem recebida do campo: nem a alfabética (E0304, E0590, E0591) nem a inversa dela. */
const ERROS_DO_CAMPO = [
  { slug: ERRO_COM_MENSAGEM_PROPRIA.slug, codigo: 'E0590' },
  { slug: ERRO_COM_MENSAGEM_IGUAL.slug, codigo: 'E0304' },
  { slug: ERRO_PROIBIDO_FORA_DO_CENARIO.slug, codigo: 'E0591' },
]

const RESUMO_DA_VERSAO = [
  ERRO_COM_MENSAGEM_IGUAL,
  ERRO_COM_MENSAGEM_PROPRIA,
  ERRO_PROIBIDO_FORA_DO_CENARIO,
]

function renderizar(props: Partial<Parameters<typeof RejeicoesDoCampo>[0]> = {}) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <>
        <p>montado</p>
        <RejeicoesDoCampo erros={ERROS_DO_CAMPO} errosResumo={RESUMO_DA_VERSAO} {...props} />
      </>
    ),
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(<RouterProvider router={router} />)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RejeicoesDoCampo — cada rejeição', () => {
  it('mostra código e título e leva à página do erro', async () => {
    renderizar()

    const link = await screen.findByRole('link', { name: /E0304\s*Informe um código de país/ })

    expect(link).toHaveAttribute('href', `/erros/${ERRO_COM_MENSAGEM_IGUAL.slug}`)
    expect(screen.getByRole('link', { name: /E0590/ })).toHaveAttribute(
      'href',
      `/erros/${ERRO_COM_MENSAGEM_PROPRIA.slug}`,
    )
  })

  it('mostra a mensagem só quando ela acrescenta algo ao título', async () => {
    renderizar()
    await screen.findByText('montado')

    expect(screen.getByText(ERRO_COM_MENSAGEM_PROPRIA.variantes[0]!)).toBeInTheDocument()
    expect(screen.getAllByText(ERRO_COM_MENSAGEM_IGUAL.titulo)).toHaveLength(1)
  })

  it('mantém a ordem em que o campo recebeu as rejeições', async () => {
    renderizar()

    const secao = await screen.findByRole('region', { name: 'Rejeições registradas (3)' })
    const codigos = within(secao)
      .getAllByRole('link')
      .map((link) => /E\d{4}/.exec(link.textContent ?? '')?.[0])

    expect(codigos).toEqual(['E0590', 'E0304', 'E0591'])
  })
})

describe('RejeicoesDoCampo — rejeição do campo ausente do resumo da versão', () => {
  it('não some: mostra o código, sem link, avisa que faltam detalhes e acusa o slug no console', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderizar({
      errosResumo: [ERRO_COM_MENSAGEM_IGUAL, ERRO_PROIBIDO_FORA_DO_CENARIO],
    })

    const secao = await screen.findByRole('region', { name: 'Rejeições registradas (3)' })
    const item = within(secao)
      .getAllByRole('listitem')
      .find((li) => li.textContent?.includes('E0590'))!

    expect(item).toHaveTextContent('detalhes indisponíveis')
    expect(within(item).queryByRole('link')).toBeNull()
    expect(within(secao).getAllByRole('link')).toHaveLength(2)
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(consoleError.mock.calls[0]![0]).toContain(ERRO_COM_MENSAGEM_PROPRIA.slug)
  })

  it('não acusa nada no console quando todas as rejeições estão no resumo', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderizar()
    await screen.findByText('montado')

    expect(consoleError).not.toHaveBeenCalled()
  })
})

describe('RejeicoesDoCampo — slug que o saneador recusa', () => {
  it('mostra o item como texto, sem link', async () => {
    const slugComTabulacao = 'e0001\t//evil.com'
    renderizar({
      erros: [{ slug: slugComTabulacao, codigo: 'E0001' }],
      errosResumo: [
        {
          slug: slugComTabulacao,
          codigo: 'E0001',
          titulo: 'Título do erro perigoso',
          variantes: [],
        },
      ],
    })

    await screen.findByRole('region', { name: 'Rejeições registradas (1)' })

    expect(screen.getByText('Título do erro perigoso')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })
})

describe('RejeicoesDoCampo — a seção', () => {
  it('leva o id da âncora e a contagem no título', async () => {
    renderizar()

    const secao = await screen.findByRole('region', { name: 'Rejeições registradas (3)' })

    expect(ID_SECAO_REJEICOES).toBe('rejeicoes-do-campo')
    expect(secao).toHaveAttribute('id', 'rejeicoes-do-campo')
  })

  it('sem rejeições, a seção não existe', async () => {
    renderizar({ erros: [] })
    await screen.findByText('montado')

    expect(document.getElementById('rejeicoes-do-campo')).toBeNull()
    expect(screen.queryByText(/Rejeições registradas/)).toBeNull()
  })
})
