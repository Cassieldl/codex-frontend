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
import type { ArtigoAdminDetalhe, ArtigoAdminListaItem } from '../types/artigoAdmin'
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

const RESERVADO_PUBLICADO: ArtigoAdminListaItem = {
  id: 5,
  slug: SLUG_COMO_FUNCIONA,
  tipo: 'Conceito',
  titulo: 'Como funciona',
  publicado: true,
  reservado: true,
  verificadoEm: '2026-08-30',
  versaoConcorrencia: 12,
}

const RASCUNHO_COMUM: ArtigoAdminListaItem = {
  id: 6,
  slug: 'migrar-para-abrasf-204',
  tipo: 'Mudanca',
  titulo: 'Migrar para ABRASF 2.04',
  publicado: false,
  reservado: false,
  verificadoEm: null,
  versaoConcorrencia: 3,
}

const DETALHE_RASCUNHO: ArtigoAdminDetalhe = {
  ...RASCUNHO_COMUM,
  corpo: '## Antes de comecar',
  campoLayoutIds: [],
  erroIds: [],
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
          data: { ...RESERVADO_PUBLICADO, corpo: '', campoLayoutIds: [], erroIds: [] },
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
      handlerArtigoAdminDetalhe(DETALHE_RASCUNHO),
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
