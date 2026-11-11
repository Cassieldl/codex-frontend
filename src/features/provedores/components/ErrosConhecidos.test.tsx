import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mensagensQueAcrescentam } from './camposDosErrosConhecidos'
import { ErrosConhecidos } from './ErrosConhecidos'

/**
 * Transcrito do `ErroResumoPublicoDto` real, **sem anotação do tipo do cliente**: anotar faria o
 * compilador moldar o mock à crença do cliente, e o teste passaria a conferir a si mesmo.
 */
const ERRO_COM_MENSAGEM_PROPRIA = {
  codigo: 'E0248',
  titulo: 'CNPJ do intermediário inválido',
  slug: 'e0248-cnpj-do-intermediario-invalido',
  variantes: ['O CNPJ informado para o intermediário não é válido.'],
}

const ERRO_COM_MENSAGEM_IGUAL = {
  codigo: 'E0953',
  titulo: 'O valor reembolso deve ser menor ou igual ao valor do serviço prestado.',
  slug: 'e0953-o-valor-reembolso',
  variantes: ['O valor reembolso deve ser menor ou igual ao valor do serviço prestado.'],
}

const ERRO_SEM_CAMPO = {
  codigo: 'E1235',
  titulo: 'Falha no esquema XML da DPS',
  slug: 'e1235-falha-no-esquema',
  variantes: [],
}

function campo(
  nome: string,
  campoLayoutSlug: string,
  errosConhecidos: { slug: string; codigo: string }[],
) {
  return {
    campoLayoutSlug,
    nome,
    caminhoXml: `//IntermServico/${nome}`,
    significado: `Significado de ${nome}`,
    reformaTributaria: false,
    tipo: 'Texto',
    tamanho: '14',
    mascara: null,
    dominio: null,
    estadoPreenchimento: 'Condicional' as const,
    condicao: null,
    exemplo: null,
    notaPreenchimento: null,
    destinoXml: null,
    notaTransformacao: null,
    ordem: 1,
    errosConhecidos,
  }
}

const CAMPOS_POR_GRUPO = [
  {
    grupo: 'IntermServico',
    grupoSlug: 'intermservico',
    campos: [
      campo('IntermCNPJ', 'intermservico-intermcnpj', [
        { slug: ERRO_COM_MENSAGEM_PROPRIA.slug, codigo: 'E0248' },
      ]),
      campo('IntermRazaoSocial', 'intermservico-intermrazaosocial', [
        { slug: ERRO_COM_MENSAGEM_IGUAL.slug, codigo: 'E0953' },
      ]),
    ],
  },
]

const RESUMO = {
  total: 3,
  itens: [ERRO_COM_MENSAGEM_PROPRIA, ERRO_COM_MENSAGEM_IGUAL, ERRO_SEM_CAMPO],
}

function renderizar(
  props: Partial<Parameters<typeof ErrosConhecidos>[0]> = {},
  resumo: typeof RESUMO = RESUMO,
) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <ErrosConhecidos resumo={resumo} camposPorGrupo={CAMPOS_POR_GRUPO} {...props} />
    ),
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(<RouterProvider router={router} />)
}

function itensDaLista() {
  return within(screen.getAllByRole('list')[0])
    .getAllByRole('listitem')
    .filter((item) => item.querySelector('a'))
}

describe('mensagensQueAcrescentam', () => {
  it('descarta a mensagem que só repete o título, mesmo com o ponto final', () => {
    expect(
      mensagensQueAcrescentam({
        ...ERRO_COM_MENSAGEM_IGUAL,
        titulo: 'O valor reembolso deve ser menor ou igual ao valor do serviço prestado',
      }),
    ).toEqual([])
    expect(mensagensQueAcrescentam(ERRO_COM_MENSAGEM_PROPRIA)).toEqual(
      ERRO_COM_MENSAGEM_PROPRIA.variantes,
    )
  })
})

describe('ErrosConhecidos — cada erro', () => {
  it('é uma linha com código e título, que leva à página do erro', async () => {
    renderizar()

    const link = await screen.findByRole('link', { name: /E0248\s*CNPJ do intermediário inválido/ })
    expect(link).toHaveAttribute('href', `/erros/${ERRO_COM_MENSAGEM_PROPRIA.slug}`)
  })

  it('mostra a mensagem observada só quando ela diz algo além do título', async () => {
    renderizar()
    await screen.findByText(ERRO_COM_MENSAGEM_PROPRIA.titulo)

    expect(screen.getByText(ERRO_COM_MENSAGEM_PROPRIA.variantes[0])).toBeInTheDocument()
    expect(screen.getAllByText(ERRO_COM_MENSAGEM_IGUAL.titulo)).toHaveLength(1)
  })

  it('diz o campo relacionado; erro sem campo não ganha a linha', async () => {
    renderizar()

    const linha = (await screen.findByText(ERRO_COM_MENSAGEM_PROPRIA.titulo)).closest('a')!
    expect(linha).toHaveTextContent('Campo: IntermCNPJ')
    expect(screen.getByText(ERRO_SEM_CAMPO.titulo).closest('a')).not.toHaveTextContent('Campo')
  })

  // O prefixo fixo `/erros/` já mantém o destino na mesma origem; o que este caso prova é o ramo
  // de texto quando o saneador recusa o slug (caractere de controle).
  it('slug recusado pelo saneador vira texto, sem link', async () => {
    const titulo = 'Título do erro com slug perigoso'
    renderizar({}, { total: 1, itens: [{ ...ERRO_SEM_CAMPO, slug: 'e0001\t//evil.com', titulo }] })

    expect(await screen.findByText(titulo)).toBeInTheDocument()
    expect(screen.getByText(titulo).closest('a')).toBeNull()
  })
})

describe('ErrosConhecidos — busca', () => {
  async function buscar(termo: string) {
    renderizar()
    fireEvent.change(await screen.findByRole('searchbox'), { target: { value: termo } })
  }

  it('filtra pelo código', async () => {
    await buscar('e1235')
    expect(itensDaLista().map((item) => item.textContent)).toEqual([
      expect.stringContaining('E1235'),
    ])
  })

  it('filtra pelo texto, sem depender de acento', async () => {
    await buscar('intermediario')
    expect(itensDaLista()).toHaveLength(1)
    expect(itensDaLista()[0]).toHaveTextContent('E0248')
  })

  it('filtra pelo nome do campo relacionado', async () => {
    await buscar('IntermRazaoSocial')
    expect(itensDaLista()).toHaveLength(1)
    expect(itensDaLista()[0]).toHaveTextContent('E0953')
  })

  it('sem resultado, diz isso e oferece limpar', async () => {
    await buscar('nada-com-isso')

    expect(screen.getByText('Nenhum erro encontrado para esse filtro.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(itensDaLista()).toHaveLength(3)
  })
})

describe('ErrosConhecidos — quantidade', () => {
  const QUINZE = {
    total: 15,
    itens: Array.from({ length: 15 }, (_, indice) => ({
      codigo: `E${String(indice).padStart(4, '0')}`,
      titulo: `Erro número ${indice}`,
      slug: `e${indice}-erro`,
      variantes: [],
    })),
  }

  // Literais, não a constante: 10 é decisão de produto, e o teste tem de cair se ela mudar.
  it('mostra 10 de cada vez, com o total à vista', async () => {
    renderizar({}, QUINZE)
    await screen.findByText('Erro número 0')

    expect(itensDaLista()).toHaveLength(10)
    expect(screen.getByText('Mostrando 10 de 15')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais 5' }))

    expect(itensDaLista()).toHaveLength(15)
    expect(screen.queryByRole('button', { name: /Mostrar mais/ })).not.toBeInTheDocument()
  })
})

describe('ErrosConhecidos — vazio', () => {
  it('não renderiza a seção quando a versão não tem erro', () => {
    const { container } = render(
      <ErrosConhecidos resumo={{ total: 0, itens: [] }} camposPorGrupo={CAMPOS_POR_GRUPO} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
