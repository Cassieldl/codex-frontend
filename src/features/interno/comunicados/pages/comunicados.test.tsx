import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { keycloak } from '../../../../auth/keycloak'
import { handlerComunicadoDetalhe, handlerComunicadosLista } from '../../../../test/mocks/handlers'
import { server } from '../../../../test/mocks/server'
import type { ComunicadoAdminDetalhe, ComunicadoAdminListaItem } from '../types/comunicadoAdmin'
import { ComunicadosPage } from './comunicados'

const API_URL = import.meta.env.VITE_API_URL

const TODAS_AS_ROLES = [
  'comunicados-buscar',
  'comunicados-adicionar',
  'comunicados-atualizar',
  'comunicados-remover',
  'comunicados-publicar',
  'provedores-buscar',
]

function autenticarCom(roles: string[]) {
  keycloak.tokenParsed = { resource_access: { 'codex-backend': { roles } } }
}

/** Provedores para o select de escopo do formulário (I1). */
function handlerProvedores() {
  return http.get(`${API_URL}/interno/provedores`, () =>
    HttpResponse.json({
      items: [
        {
          id: 4,
          slug: 'prefeitura-de-exemplo',
          nome: 'Prefeitura de Exemplo',
          categoria: 'Nacional',
          identificadorInvoicy: 'PREF-EXEMPLO',
          publicado: true,
          versaoConcorrencia: 1,
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 200,
      totalPages: 1,
    }),
  )
}

const RASCUNHO_VIGENTE: ComunicadoAdminListaItem = {
  id: 11,
  titulo: 'Rascunho ainda vigente',
  severidade: 'Alerta',
  abrangencia: 'Global',
  provedorNome: null,
  versaoRotulo: null,
  expiraEm: '2099-01-10T12:00:00+00:00',
  publicado: false,
  encerrado: false,
  versaoConcorrencia: 3,
}

const PUBLICADO_VIGENTE: ComunicadoAdminListaItem = {
  id: 12,
  titulo: 'Publicado e vigente',
  severidade: 'Critico',
  abrangencia: 'ProvedorVersao',
  provedorNome: 'Prefeitura de Exemplo',
  versaoRotulo: 'ABRASF 2.04',
  expiraEm: '2099-01-09T12:00:00+00:00',
  publicado: true,
  encerrado: false,
  versaoConcorrencia: 5,
}

const PUBLICADO_ENCERRADO: ComunicadoAdminListaItem = {
  id: 13,
  titulo: 'Publicado e já encerrado',
  severidade: 'Informativo',
  abrangencia: 'Provedor',
  provedorNome: 'Prefeitura de Exemplo',
  versaoRotulo: null,
  expiraEm: '2001-01-08T12:00:00+00:00',
  publicado: true,
  encerrado: true,
  versaoConcorrencia: 8,
}

const DETALHE_PUBLICADO_ENCERRADO: ComunicadoAdminDetalhe = {
  ...PUBLICADO_ENCERRADO,
  corpo: 'Este comunicado já venceu.',
  provedorId: 4,
  versaoProvedorId: null,
}

function renderizarPagina() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return render(<ComunicadosPage />, { wrapper: Wrapper })
}

function linhaDoComunicado(titulo: string): HTMLElement {
  return screen.getByRole('row', { name: new RegExp(titulo, 'i') })
}

beforeEach(() => {
  autenticarCom(TODAS_AS_ROLES)
})

afterEach(() => {
  keycloak.tokenParsed = undefined
})

describe('ComunicadosPage — estados de carregamento', () => {
  it('anuncia o carregamento antes de a lista chegar', async () => {
    server.use(handlerProvedores(), handlerComunicadosLista([RASCUNHO_VIGENTE]))

    renderizarPagina()

    expect(screen.getByText('Carregando comunicados…')).toBeInTheDocument()
    expect(await screen.findByText('Rascunho ainda vigente')).toBeInTheDocument()
  })

  it('oferece nova tentativa quando a listagem falha', async () => {
    server.use(
      handlerProvedores(),
      http.get(`${API_URL}/interno/comunicados`, () => new HttpResponse(null, { status: 500 })),
    )

    renderizarPagina()

    expect(await screen.findByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
  })

  it('o vazio da visão padrão aponta o caminho para o histórico', async () => {
    server.use(handlerProvedores(), handlerComunicadosLista([]))

    renderizarPagina()

    expect(
      await screen.findByText(
        'Nenhum comunicado em vigência. Marque a opção acima para ver os já encerrados.',
      ),
    ).toBeInTheDocument()
  })
})

describe('ComunicadosPage — o filtro esconde o encerrado, nunca o rascunho', () => {
  it('a visão padrão pede incluirEncerrados=false e exibe o rascunho vigente como "Rascunho"', async () => {
    const capturado: { url: URL | null } = { url: null }
    server.use(
      handlerProvedores(),
      http.get(`${API_URL}/interno/comunicados`, ({ request }) => {
        capturado.url = new URL(request.url)
        return HttpResponse.json({
          items: [RASCUNHO_VIGENTE, PUBLICADO_VIGENTE],
          totalCount: 2,
          page: 1,
          pageSize: 25,
          totalPages: 1,
        })
      }),
    )

    renderizarPagina()

    await screen.findByText('Rascunho ainda vigente')
    expect(capturado.url?.searchParams.get('incluirEncerrados')).toBe('false')

    // O ponto: `incluirEncerrados=false` não esconde rascunho — esconde só o
    // que ENCERROU. Um comunicado em preparação tem de aparecer na visão
    // padrão, com o badge que diz que ele ainda não está no ar.
    const linhaRascunho = linhaDoComunicado('Rascunho ainda vigente')
    expect(within(linhaRascunho).getByText('Rascunho')).toBeInTheDocument()
    expect(within(linhaRascunho).queryByText('Encerrado')).not.toBeInTheDocument()

    const linhaPublicado = linhaDoComunicado('Publicado e vigente')
    expect(within(linhaPublicado).getByText('Publicado')).toBeInTheDocument()
  })

  it('marcar o filtro refaz a busca com incluirEncerrados=true e traz o encerrado', async () => {
    const usuario = userEvent.setup()
    const pedidos: string[] = []
    server.use(
      handlerProvedores(),
      http.get(`${API_URL}/interno/comunicados`, ({ request }) => {
        const incluir = new URL(request.url).searchParams.get('incluirEncerrados')
        pedidos.push(String(incluir))
        const items =
          incluir === 'true'
            ? [RASCUNHO_VIGENTE, PUBLICADO_VIGENTE, PUBLICADO_ENCERRADO]
            : [RASCUNHO_VIGENTE, PUBLICADO_VIGENTE]
        return HttpResponse.json({
          items,
          totalCount: items.length,
          page: 1,
          pageSize: 25,
          totalPages: 1,
        })
      }),
    )

    renderizarPagina()

    await screen.findByText('Rascunho ainda vigente')
    expect(screen.queryByText('Publicado e já encerrado')).not.toBeInTheDocument()

    await usuario.click(screen.getByLabelText('Mostrar também os comunicados já encerrados'))

    expect(await screen.findByText('Publicado e já encerrado')).toBeInTheDocument()
    expect(pedidos).toEqual(['false', 'true'])

    // O rascunho continua lá: o filtro é sobre vigência, não sobre publicação.
    expect(screen.getByText('Rascunho ainda vigente')).toBeInTheDocument()
    const linhaEncerrado = linhaDoComunicado('Publicado e já encerrado')
    expect(within(linhaEncerrado).getByText('Encerrado')).toBeInTheDocument()
  })
})

describe('ComunicadosPage — colunas da tabela', () => {
  it('descreve a abrangência de cada escopo com o texto certo', async () => {
    server.use(
      handlerProvedores(),
      handlerComunicadosLista([RASCUNHO_VIGENTE, PUBLICADO_VIGENTE, PUBLICADO_ENCERRADO]),
    )

    renderizarPagina()

    await screen.findByText('Rascunho ainda vigente')

    expect(
      within(linhaDoComunicado('Rascunho ainda vigente')).getByText('Todo o portal'),
    ).toBeInTheDocument()
    expect(
      within(linhaDoComunicado('Publicado e vigente')).getByText(
        'Prefeitura de Exemplo · ABRASF 2.04',
      ),
    ).toBeInTheDocument()
    expect(
      within(linhaDoComunicado('Publicado e já encerrado')).getByText('Prefeitura de Exemplo'),
    ).toBeInTheDocument()
  })

  it('formata a expiração em português, nunca o ISO cru', async () => {
    server.use(handlerProvedores(), handlerComunicadosLista([PUBLICADO_ENCERRADO]))

    renderizarPagina()

    const linha = await waitFor(() => linhaDoComunicado('Publicado e já encerrado'))
    expect(within(linha).queryByText(PUBLICADO_ENCERRADO.expiraEm)).not.toBeInTheDocument()
    expect(within(linha).getByText(/^\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/)).toBeInTheDocument()
  })
})

describe('ComunicadosPage — permissões só de UX', () => {
  it('sem comunicados-adicionar, o botão de criar não existe', async () => {
    autenticarCom(['comunicados-buscar', 'provedores-buscar'])
    server.use(handlerProvedores(), handlerComunicadosLista([RASCUNHO_VIGENTE]))

    renderizarPagina()

    await screen.findByText('Rascunho ainda vigente')
    expect(screen.queryByRole('button', { name: /novo comunicado/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^publicar$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /editar comunicado/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remover comunicado/i })).not.toBeInTheDocument()
  })

  it('com todas as roles, as quatro ações aparecem', async () => {
    server.use(handlerProvedores(), handlerComunicadosLista([RASCUNHO_VIGENTE]))

    renderizarPagina()

    await screen.findByText('Rascunho ainda vigente')
    expect(screen.getByRole('button', { name: /novo comunicado/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^publicar$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /editar comunicado/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remover comunicado/i })).toBeInTheDocument()
  })
})

describe('ComunicadosPage — edição carrega o detalhe (I31)', () => {
  it('abre o modal com corpo e escopo preenchidos, que a listagem não tem', async () => {
    const usuario = userEvent.setup()
    server.use(
      handlerProvedores(),
      handlerComunicadosLista([PUBLICADO_ENCERRADO]),
      handlerComunicadoDetalhe(DETALHE_PUBLICADO_ENCERRADO),
    )

    renderizarPagina()

    await screen.findByText('Publicado e já encerrado')
    await usuario.click(screen.getByRole('button', { name: /editar comunicado/i }))

    const corpo = await screen.findByLabelText(/corpo/i)
    expect(corpo).toHaveValue('Este comunicado já venceu.')
    expect(screen.getByRole('combobox', { name: /provedor/i })).toHaveTextContent(
      'Prefeitura de Exemplo',
    )
  })
})

describe('ComunicadosPage — publicar comunicado expirado (B-4)', () => {
  const MENSAGEM_DO_BACKEND =
    'Não é possível publicar um comunicado cuja expiração já passou. Edite o comunicado para estender a data de expiração para o futuro e publique em seguida.'

  it('mostra a mensagem do backend inteira — ela é o requisito, não decoração', async () => {
    const usuario = userEvent.setup()
    const rascunhoEncerrado: ComunicadoAdminListaItem = {
      ...PUBLICADO_ENCERRADO,
      publicado: false,
      encerrado: true,
    }
    server.use(
      handlerProvedores(),
      handlerComunicadosLista([rascunhoEncerrado]),
      http.put(`${API_URL}/interno/comunicados/13/publicacao`, () =>
        HttpResponse.json(
          { error: { code: 'COMUNICADO_EXPIRADO', message: MENSAGEM_DO_BACKEND } },
          { status: 422 },
        ),
      ),
    )

    renderizarPagina()

    await screen.findByText('Publicado e já encerrado')
    await usuario.click(screen.getByRole('button', { name: /^publicar$/i }))

    const alerta = await screen.findByRole('alert')
    // A instrução do próximo passo ("estender a expiração e publicar em
    // seguida") só chega ao editor se a mensagem do backend for exibida como
    // veio. Texto genérico do cliente no lugar dela é um beco sem saída.
    expect(alerta).toHaveTextContent(MENSAGEM_DO_BACKEND)
  })

  it('a saída oferecida é editar a expiração, e abre o formulário do comunicado', async () => {
    const usuario = userEvent.setup()
    const rascunhoEncerrado: ComunicadoAdminListaItem = {
      ...PUBLICADO_ENCERRADO,
      publicado: false,
      encerrado: true,
    }
    server.use(
      handlerProvedores(),
      handlerComunicadosLista([rascunhoEncerrado]),
      handlerComunicadoDetalhe({
        ...DETALHE_PUBLICADO_ENCERRADO,
        publicado: false,
      }),
      http.put(`${API_URL}/interno/comunicados/13/publicacao`, () =>
        HttpResponse.json(
          { error: { code: 'COMUNICADO_EXPIRADO', message: MENSAGEM_DO_BACKEND } },
          { status: 422 },
        ),
      ),
    )

    renderizarPagina()

    await screen.findByText('Publicado e já encerrado')
    await usuario.click(screen.getByRole('button', { name: /^publicar$/i }))
    await usuario.click(await screen.findByRole('button', { name: 'Editar expiração' }))

    expect(await screen.findByLabelText(/expira em/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/corpo/i)).toHaveValue('Este comunicado já venceu.')
  })
})

describe('ComunicadosPage — 409 e 400 não se confundem', () => {
  it('409 CONFLITO_CONCORRENCIA oferece recarregar o registro', async () => {
    const usuario = userEvent.setup()
    server.use(
      handlerProvedores(),
      handlerComunicadosLista([PUBLICADO_VIGENTE]),
      http.put(`${API_URL}/interno/comunicados/12/publicacao`, () =>
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

    renderizarPagina()

    await screen.findByText('Publicado e vigente')
    await usuario.click(screen.getByRole('button', { name: /despublicar/i }))

    expect(
      await screen.findByRole('button', { name: 'Recarregar este comunicado' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Recarregar a lista' })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Outra pessoa salvou uma alteração depois que você abriu este comunicado.',
    )
  })

  it('400 IF_MATCH_OBRIGATORIO oferece recarregar a lista — saída diferente', async () => {
    const usuario = userEvent.setup()
    server.use(
      handlerProvedores(),
      handlerComunicadosLista([PUBLICADO_VIGENTE]),
      http.put(`${API_URL}/interno/comunicados/12/publicacao`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'IF_MATCH_OBRIGATORIO',
              message: 'O header If-Match é obrigatório nesta operação.',
            },
          },
          { status: 400 },
        ),
      ),
    )

    renderizarPagina()

    await screen.findByText('Publicado e vigente')
    await usuario.click(screen.getByRole('button', { name: /despublicar/i }))

    // A distinção precisa chegar à tela: se os dois códigos caíssem no mesmo
    // texto e no mesmo botão, o editor não saberia se o problema é dele
    // (registro velho) ou de outra pessoa (alguém salvou antes).
    expect(await screen.findByRole('button', { name: 'Recarregar a lista' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Recarregar este comunicado' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'O comunicado foi carregado sem o identificador de versão exigido para salvar.',
    )
  })
})

describe('ComunicadosPage — criação', () => {
  it('salvar com sucesso fecha o modal e recarrega a lista', async () => {
    const usuario = userEvent.setup()
    let criado = false
    server.use(
      handlerProvedores(),
      http.get(`${API_URL}/interno/comunicados`, () => {
        const items = criado ? [RASCUNHO_VIGENTE, PUBLICADO_VIGENTE] : [RASCUNHO_VIGENTE]
        return HttpResponse.json({
          items,
          totalCount: items.length,
          page: 1,
          pageSize: 25,
          totalPages: 1,
        })
      }),
      http.post(`${API_URL}/interno/comunicados`, () => {
        criado = true
        return HttpResponse.json(
          { data: { ...PUBLICADO_VIGENTE, corpo: 'x', provedorId: 4, versaoProvedorId: 9 } },
          { status: 201 },
        )
      }),
    )

    renderizarPagina()

    await screen.findByText('Rascunho ainda vigente')
    await usuario.click(screen.getByRole('button', { name: /novo comunicado/i }))

    await usuario.type(await screen.findByLabelText(/título/i), 'Instabilidade na SEFIN')
    await usuario.type(screen.getByLabelText(/corpo/i), 'Emissões podem demorar.')
    await usuario.type(screen.getByLabelText(/expira em/i), '2099-06-01T10:00')
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Publicado e vigente')).toBeInTheDocument()
  })
})
