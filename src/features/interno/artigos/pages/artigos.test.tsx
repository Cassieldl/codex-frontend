import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { keycloak } from '../../../../auth/keycloak'
import {
  handlerArtigoAdminDetalhe,
  handlerArtigoExiste,
  handlerArtigosAdminLista,
} from '../../../../test/mocks/handlers'
import { server } from '../../../../test/mocks/server'
import { SLUG_COMO_FUNCIONA } from '../../../artigos/utils/slugsReservados'
import { ArtigosPage } from './artigos'

const API_URL = import.meta.env.VITE_API_URL

const TODAS_AS_ROLES = [
  'artigos-buscar',
  'artigos-adicionar',
  'artigos-atualizar',
  'artigos-remover',
  'artigos-publicar',
  'erros-buscar',
  'versoeslayout-buscar',
  'campolayout-buscar',
]

function autenticarCom(roles: string[]) {
  keycloak.tokenParsed = { resource_access: { 'codex-backend': { roles } } }
}

// JSON literal transcrito de ArtigoAdminListaItemDto, sem o tipo do cliente.
const RESERVADO_PUBLICADO = {
  id: 5,
  slug: SLUG_COMO_FUNCIONA,
  tipo: 'Conceito',
  titulo: 'Como funciona',
  publicado: true,
  reservado: true,
  verificadoEm: '2026-08-30',
  versaoConcorrencia: 12,
}

const RASCUNHO_COMUM = {
  id: 6,
  slug: 'migrar-para-abrasf-204',
  tipo: 'Mudanca',
  titulo: 'Migrar para ABRASF 2.04',
  publicado: false,
  reservado: false,
  verificadoEm: null,
  versaoConcorrencia: 3,
}

// JSON transcrito do `ArtigoAdminDto`, sem anotação do tipo do cliente.
const DETALHE_RASCUNHO = {
  ...RASCUNHO_COMUM,
  corpo: '## Antes de comecar',
  campoLayoutIds: [],
  erroIds: [],
  erros: [],
  camposLayout: [],
}

/** Fontes das opções de referência cruzada do formulário — I15a, I16 e I18. */
function handlersDeReferencia() {
  return [
    http.get(`${API_URL}/interno/layout/versoes`, () =>
      HttpResponse.json({
        items: [
          {
            id: 2,
            rotulo: 'Layout InvoiCy 3.0',
            publicado: true,
            versaoConcorrencia: 1,
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 200,
        totalPages: 1,
      }),
    ),
    http.get(`${API_URL}/interno/layout/versoes/2/campos`, () =>
      HttpResponse.json({
        data: [
          {
            id: 3,
            nome: 'Discriminacao',
            caminhoXml: '//Rps/Discriminacao',
            significado: 'Texto livre do servico',
            grupo: null,
            ordem: 1,
            estado: 'Ativo',
            versaoLayoutDescontinuadoId: null,
            publicado: true,
            versaoConcorrencia: 1,
          },
        ],
        message: null,
      }),
    ),
    http.get(`${API_URL}/interno/erros`, () =>
      HttpResponse.json({
        items: [
          {
            id: 17,
            codigo: 'E0117',
            origem: 'Schema',
            titulo: 'RPS invalido',
            causaProvavel: null,
            solucaoSugerida: null,
            variantes: [],
            versoesAplicaveis: [],
            camposRelacionados: [],
            publicado: true,
            versaoConcorrencia: 1,
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 200,
        totalPages: 1,
      }),
    ),
  ]
}

function renderizarPagina() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return render(<ArtigosPage />, { wrapper: Wrapper })
}

function linhaDoArtigo(titulo: string): HTMLElement {
  return screen.getByRole('row', { name: new RegExp(titulo, 'i') })
}

beforeEach(() => {
  autenticarCom(TODAS_AS_ROLES)
})

afterEach(() => {
  keycloak.tokenParsed = undefined
})

describe('ArtigosPage — estados de carregamento', () => {
  it('anuncia o carregamento antes de a lista chegar', async () => {
    server.use(
      ...handlersDeReferencia(),
      handlerArtigoExiste(SLUG_COMO_FUNCIONA, 5),
      handlerArtigosAdminLista([RESERVADO_PUBLICADO]),
    )

    renderizarPagina()

    expect(screen.getByText('Carregando artigos…')).toBeInTheDocument()
    expect(await screen.findByText('Como funciona')).toBeInTheDocument()
  })

  it('oferece nova tentativa quando a listagem falha', async () => {
    server.use(
      ...handlersDeReferencia(),
      handlerArtigoExiste(SLUG_COMO_FUNCIONA, 5),
      http.get(`${API_URL}/interno/artigos`, () => new HttpResponse(null, { status: 500 })),
    )

    renderizarPagina()

    expect(await screen.findByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
  })

  it('acervo vazio mostra estado próprio, nunca tabela sem linhas', async () => {
    server.use(
      ...handlersDeReferencia(),
      handlerArtigoExiste(SLUG_COMO_FUNCIONA, null),
      handlerArtigosAdminLista([]),
    )

    renderizarPagina()

    expect(await screen.findByText('Nenhum artigo cadastrado ainda.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('ArtigosPage — aviso do artigo reservado ausente (I36)', () => {
  it('aparece quando I36 diz que o slug reservado não existe, com atalho de criação pré-preenchida', async () => {
    const usuario = userEvent.setup()
    server.use(
      ...handlersDeReferencia(),
      handlerArtigoExiste(SLUG_COMO_FUNCIONA, null),
      handlerArtigosAdminLista([RASCUNHO_COMUM]),
    )

    renderizarPagina()

    const aviso = await screen.findByRole('status')
    expect(aviso).toHaveTextContent(/ainda não existe/i)

    await usuario.click(within(aviso).getByRole('button', { name: 'Criar agora' }))

    // Pré-preenche o título que produz o slug reservado no servidor — a UI
    // sugere o título, nunca força o slug.
    expect(screen.getByRole('textbox', { name: /Título/ })).toHaveValue('Como funciona')
  })

  it('some quando I36 confirma a existência, mesmo com o artigo fora da página atual', async () => {
    server.use(
      ...handlersDeReferencia(),
      // A listagem NÃO traz o reservado: se a detecção varresse a página, ela
      // concluiria "ainda não existe" — é o falso negativo que I36 elimina.
      handlerArtigosAdminLista([RASCUNHO_COMUM]),
      handlerArtigoExiste(SLUG_COMO_FUNCIONA, 5),
    )

    renderizarPagina()

    await screen.findByText('Migrar para ABRASF 2.04')
    await waitFor(() => expect(screen.queryByText(/ainda não existe/i)).not.toBeInTheDocument())
  })

  it('a pergunta vai ao endpoint dedicado com o slug reservado', async () => {
    const capturado: { url: URL | null } = { url: null }
    server.use(
      ...handlersDeReferencia(),
      handlerArtigosAdminLista([RASCUNHO_COMUM]),
      http.get(`${API_URL}/interno/artigos/existe`, ({ request }) => {
        capturado.url = new URL(request.url)
        return HttpResponse.json({
          data: { slug: SLUG_COMO_FUNCIONA, existe: true, artigoId: 5 },
          message: null,
        })
      }),
    )

    renderizarPagina()

    await screen.findByText('Migrar para ABRASF 2.04')
    await waitFor(() => expect(capturado.url).not.toBeNull())
    expect(capturado.url?.searchParams.get('slug')).toBe(SLUG_COMO_FUNCIONA)
  })
})

describe('ArtigosPage — artigo reservado bloqueia remover e despublicar', () => {
  it('remover e despublicar nascem desabilitados com o motivo no title; o comum continua livre', async () => {
    server.use(
      ...handlersDeReferencia(),
      handlerArtigoExiste(SLUG_COMO_FUNCIONA, 5),
      handlerArtigosAdminLista([RESERVADO_PUBLICADO, RASCUNHO_COMUM]),
    )

    renderizarPagina()

    await screen.findByText('Como funciona')

    const linhaReservada = linhaDoArtigo('Como funciona')
    const remover = within(linhaReservada).getByRole('button', {
      name: 'Remover artigo Como funciona',
    })
    const despublicar = within(linhaReservada).getByRole('button', { name: 'Despublicar' })

    expect(remover).toBeDisabled()
    expect(remover).toHaveAttribute('title', expect.stringContaining('não pode ser removido'))
    expect(despublicar).toBeDisabled()
    expect(despublicar).toHaveAttribute('title', expect.stringContaining('não pode ser removido'))

    const linhaComum = linhaDoArtigo('Migrar para ABRASF 2.04')
    expect(
      within(linhaComum).getByRole('button', { name: 'Remover artigo Migrar para ABRASF 2.04' }),
    ).toBeEnabled()
    expect(within(linhaComum).getByRole('button', { name: 'Publicar' })).toBeEnabled()
  })

  it('publicar o reservado continua permitido — publicar nunca quebra link', async () => {
    const usuario = userEvent.setup()
    const publicacoes: unknown[] = []
    server.use(
      ...handlersDeReferencia(),
      handlerArtigoExiste(SLUG_COMO_FUNCIONA, 5),
      handlerArtigosAdminLista([{ ...RESERVADO_PUBLICADO, publicado: false }]),
      http.put(`${API_URL}/interno/artigos/5/publicacao`, async ({ request }) => {
        publicacoes.push(await request.json())
        return HttpResponse.json({
          data: {
            ...RESERVADO_PUBLICADO,
            corpo: '',
            campoLayoutIds: [],
            erroIds: [],
            erros: [],
            camposLayout: [],
          },
          message: null,
        })
      }),
    )

    renderizarPagina()

    await screen.findByText('Como funciona')
    const publicar = within(linhaDoArtigo('Como funciona')).getByRole('button', {
      name: 'Publicar',
    })
    expect(publicar).toBeEnabled()

    await usuario.click(publicar)

    await waitFor(() => expect(publicacoes).toEqual([{ publicado: true }]))
  })

  it('o 422 ARTIGO_RESERVADO do servidor vira explicação na tela, sem ação de recuperação', async () => {
    const usuario = userEvent.setup()
    const mensagemDoBackend = 'O artigo "como-funciona" é obrigatório e não pode ser removido.'
    server.use(
      ...handlersDeReferencia(),
      handlerArtigoExiste(SLUG_COMO_FUNCIONA, 5),
      // `reservado: false` no corpo simula a divergência que a rede de
      // segurança cobre: a UI libera o botão e o servidor recusa mesmo assim.
      handlerArtigosAdminLista([{ ...RESERVADO_PUBLICADO, reservado: false, publicado: false }]),
      http.delete(`${API_URL}/interno/artigos/5`, () =>
        HttpResponse.json(
          { error: { code: 'ARTIGO_RESERVADO', message: mensagemDoBackend } },
          { status: 422 },
        ),
      ),
    )

    renderizarPagina()

    await screen.findByText('Como funciona')
    await usuario.click(screen.getByRole('button', { name: 'Remover artigo Como funciona' }))

    // Remoção passou a exigir confirmação: o clique na lixeira abre o diálogo, e o DELETE — com
    // ele o 422 que este caso exercita — só sai depois do "Remover" de dentro dele.
    const dialogo = await screen.findByRole('dialog')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Remover' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(mensagemDoBackend)
    expect(alerta).toHaveTextContent(/rota pública \/como-funciona/i)
    // Nenhum gesto faz a remoção passar — oferecer botão seria beco sem saída.
    expect(within(alerta).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('ArtigosPage — edição e permissões', () => {
  it('editar busca o detalhe por id e abre o formulário com o corpo carregado', async () => {
    const usuario = userEvent.setup()
    server.use(
      ...handlersDeReferencia(),
      handlerArtigoExiste(SLUG_COMO_FUNCIONA, 5),
      handlerArtigosAdminLista([RASCUNHO_COMUM]),
      handlerArtigoAdminDetalhe(RASCUNHO_COMUM.id, DETALHE_RASCUNHO),
    )

    renderizarPagina()

    await screen.findByText('Migrar para ABRASF 2.04')
    await usuario.click(
      screen.getByRole('button', { name: 'Editar artigo Migrar para ABRASF 2.04' }),
    )

    const corpo = await screen.findByRole('textbox', { name: /Corpo/ })
    expect(corpo).toHaveValue('## Antes de comecar')
  })

  it('sem role de escrita, a tela vira somente leitura', async () => {
    autenticarCom(['artigos-buscar', 'erros-buscar', 'versoeslayout-buscar', 'campolayout-buscar'])
    server.use(
      ...handlersDeReferencia(),
      handlerArtigoExiste(SLUG_COMO_FUNCIONA, 5),
      handlerArtigosAdminLista([RASCUNHO_COMUM]),
    )

    renderizarPagina()

    await screen.findByText('Migrar para ABRASF 2.04')

    expect(screen.queryByRole('button', { name: 'Novo artigo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Editar artigo/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remover artigo/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument()
  })

  it('marcar como verificado manda a data de hoje com o If-Match da linha', async () => {
    const usuario = userEvent.setup()
    const capturado: { corpo: Record<string, unknown> | null; ifMatch: string | null } = {
      corpo: null,
      ifMatch: null,
    }
    server.use(
      ...handlersDeReferencia(),
      handlerArtigoExiste(SLUG_COMO_FUNCIONA, 5),
      handlerArtigosAdminLista([RASCUNHO_COMUM]),
      http.put(`${API_URL}/interno/artigos/6/verificacao`, async ({ request }) => {
        capturado.corpo = (await request.json()) as Record<string, unknown>
        capturado.ifMatch = request.headers.get('If-Match')
        return HttpResponse.json({ data: DETALHE_RASCUNHO, message: null })
      }),
    )

    renderizarPagina()

    await screen.findByText('Migrar para ABRASF 2.04')
    await usuario.click(
      screen.getByRole('button', {
        name: 'Marcar artigo Migrar para ABRASF 2.04 como verificado hoje',
      }),
    )

    await waitFor(() => expect(capturado.corpo).not.toBeNull())
    expect(capturado.ifMatch).toBe('W/"3"')
    expect(String(capturado.corpo?.verificadoEm)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('ArtigosPage: vínculos do artigo', () => {
  const TOTAL_DE_ERROS = 250

  /** Erro de número `n`: o de número 250 só aparece por busca, nunca na primeira página. */
  function erroNumero(n: number) {
    return {
      id: 1000 + n,
      codigo: `E${String(n).padStart(4, '0')}`,
      origem: 'Schema',
      titulo: `Mensagem do erro ${n}`,
      causaProvavel: null,
      solucaoSugerida: null,
      variantes: [],
      versoesAplicaveis: [],
      camposRelacionados: [],
      publicado: true,
      versaoConcorrencia: 1,
    }
  }

  function campoLayout(id: number, nome: string, caminhoXml: string) {
    return {
      id,
      nome,
      caminhoXml,
      significado: 'Significado',
      grupo: null,
      ordem: id,
      estado: 'Ativo',
      versaoLayoutDescontinuadoId: null,
      publicado: true,
      versaoConcorrencia: 1,
    }
  }

  // JSON transcrito do `ArtigoAdminDto`: o E0999 foi removido e segue vinculado.
  const DETALHE_COM_VINCULOS = {
    ...RASCUNHO_COMUM,
    corpo: '## Antes de comecar',
    campoLayoutIds: [40],
    erroIds: [12, 99],
    erros: [
      { id: 12, codigo: 'E0037', titulo: 'RPS ja informado', desativado: false },
      { id: 99, codigo: 'E0999', titulo: 'Erro que saiu do ar', desativado: true },
    ],
    camposLayout: [
      {
        id: 40,
        nome: 'ValServicos',
        caminhoXml: 'Servico/Valores/ValServicos',
        versaoLayoutId: 3,
        versaoLayoutRotulo: '8',
        desativado: false,
      },
    ],
  }

  function servidorDeVinculos() {
    const termosBuscados: (string | null)[] = []
    const corposEnviados: unknown[] = []

    server.use(
      handlerArtigoExiste(SLUG_COMO_FUNCIONA, 5),
      handlerArtigosAdminLista([RASCUNHO_COMUM]),
      handlerArtigoAdminDetalhe(RASCUNHO_COMUM.id, DETALHE_COM_VINCULOS),
      http.get(`${API_URL}/interno/layout/versoes`, () =>
        HttpResponse.json({
          items: [
            { id: 3, rotulo: '8', ordem: 2, publicado: true, versaoConcorrencia: 1 },
            { id: 2, rotulo: '7', ordem: 1, publicado: true, versaoConcorrencia: 1 },
          ],
          totalCount: 2,
          page: 1,
          pageSize: 200,
          totalPages: 1,
        }),
      ),
      http.get(`${API_URL}/interno/layout/versoes/3/campos`, () =>
        HttpResponse.json({
          data: [
            campoLayout(40, 'ValServicos', 'Servico/Valores/ValServicos'),
            campoLayout(41, 'IssRetido', 'Servico/Valores/IssRetido'),
          ],
          message: null,
        }),
      ),
      http.get(`${API_URL}/interno/layout/versoes/2/campos`, () =>
        HttpResponse.json({
          data: [campoLayout(3, 'Discriminacao', 'Rps/Discriminacao')],
          message: null,
        }),
      ),
      http.get(`${API_URL}/interno/erros`, ({ request }) => {
        const parametros = new URL(request.url).searchParams
        const termo = parametros.get('q')
        termosBuscados.push(termo)
        const tamanhoPagina = Number(parametros.get('tamanhoPagina') ?? 25)
        const todos = Array.from({ length: TOTAL_DE_ERROS }, (_, indice) => erroNumero(indice + 1))
        const encontrados = termo ? todos.filter((erro) => erro.codigo === termo) : todos
        return HttpResponse.json({
          items: encontrados.slice(0, tamanhoPagina),
          totalCount: encontrados.length,
          page: 1,
          pageSize: tamanhoPagina,
          totalPages: Math.ceil(encontrados.length / tamanhoPagina),
        })
      }),
      http.put(`${API_URL}/interno/artigos/${RASCUNHO_COMUM.id}`, async ({ request }) => {
        corposEnviados.push(await request.json())
        return HttpResponse.json({ data: DETALHE_COM_VINCULOS, message: null })
      }),
    )

    return { termosBuscados, corposEnviados }
  }

  async function abrirEdicao(usuario: ReturnType<typeof userEvent.setup>) {
    renderizarPagina()
    await screen.findByText('Migrar para ABRASF 2.04')
    await usuario.click(
      screen.getByRole('button', { name: 'Editar artigo Migrar para ABRASF 2.04' }),
    )
    return screen.findByRole('dialog')
  }

  it('mostra os vínculos gravados com rótulo, inclusive o removido, sem depender da busca', async () => {
    const usuario = userEvent.setup()
    servidorDeVinculos()

    const dialogo = await abrirEdicao(usuario)

    const errosVinculados = await within(dialogo).findByRole('list', { name: 'Erros vinculados' })
    const itensDeErro = within(errosVinculados).getAllByRole('listitem')
    expect(itensDeErro.map((item) => item.textContent)).toEqual([
      'E0037 RPS ja informado',
      'E0999 Erro que saiu do arRemovido',
    ])

    const camposVinculados = within(dialogo).getByRole('list', { name: 'Campos vinculados' })
    expect(within(camposVinculados).getByRole('listitem')).toHaveTextContent(
      'ValServicosServico/Valores/ValServicosversão 8',
    )
  })

  it('busca um erro além do 200º, troca a versão do layout, remove o removido e envia os ids certos', async () => {
    const usuario = userEvent.setup()
    const { termosBuscados, corposEnviados } = servidorDeVinculos()

    const dialogo = await abrirEdicao(usuario)
    await within(dialogo).findByRole('list', { name: 'Erros vinculados' })

    await usuario.click(
      within(dialogo).getByRole('button', { name: 'Remover vínculo com o erro E0999' }),
    )

    expect(within(dialogo).queryByRole('checkbox', { name: /E0250/ })).not.toBeInTheDocument()
    await usuario.type(
      within(dialogo).getByRole('searchbox', { name: /Buscar erro para vincular/ }),
      'E0250',
    )
    await usuario.click(await within(dialogo).findByRole('checkbox', { name: /E0250/ }))

    await usuario.click(within(dialogo).getByRole('combobox', { name: /Versão do layout/ }))
    await usuario.click(within(dialogo).getByRole('option', { name: '7' }))
    await usuario.click(await within(dialogo).findByRole('checkbox', { name: /Discriminacao/ }))

    const errosVinculados = within(dialogo).getByRole('list', { name: 'Erros vinculados' })
    expect(
      within(errosVinculados)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['E0037 RPS ja informado', 'E0250 Mensagem do erro 250'])

    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(corposEnviados).toHaveLength(1))
    expect(corposEnviados[0]).toMatchObject({ erroIds: [12, 1250], campoLayoutIds: [40, 3] })

    // O debounce guarda a busca até o termo parar de mudar: nenhuma letra solta chega ao servidor.
    expect(termosBuscados.filter((termo) => termo !== null)).toEqual(['E0250'])
  })

  it('salvar sem tocar nos vínculos reenvia todos os ids, inclusive o do item removido', async () => {
    const usuario = userEvent.setup()
    const { corposEnviados } = servidorDeVinculos()

    const dialogo = await abrirEdicao(usuario)
    await within(dialogo).findByRole('list', { name: 'Erros vinculados' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(corposEnviados).toHaveLength(1))
    expect(corposEnviados[0]).toMatchObject({ erroIds: [12, 99], campoLayoutIds: [40] })
  })
})
