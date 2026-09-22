import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { keycloak } from '../../../../auth/keycloak'
import { server } from '../../../../test/mocks/server'
import { PublicarComunicadoGlobal } from './PublicarComunicadoGlobal'

const API_URL = import.meta.env.VITE_API_URL

function autenticarCom(roles: string[]) {
  keycloak.tokenParsed = { resource_access: { 'codex-backend': { roles } } }
}

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

const comunicadoCriado = {
  id: 90,
  titulo: 'Instabilidade na SEFIN',
  corpo: 'Emissões podem demorar até as 18h.',
  severidade: 'Informativo',
  abrangencia: 'Global',
  provedorId: null,
  provedorNome: null,
  versaoProvedorId: null,
  versaoRotulo: null,
  expiraEm: '2099-03-01T18:00:00+00:00',
  encerrado: false,
  versaoConcorrencia: 1,
}

/**
 * Espelha I32: `publicado` sai do que o backend FEZ e a `message` descreve esse
 * mesmo fato — nunca o `publicar` que o cliente pediu.
 */
function handlerCriar(capturado?: { corpo: Record<string, unknown> | null }) {
  return http.post(`${API_URL}/interno/comunicados`, async ({ request }) => {
    const corpo = (await request.json()) as Record<string, unknown>
    if (capturado) capturado.corpo = corpo

    const publicou = corpo.publicar === true
    return HttpResponse.json(
      {
        data: { ...comunicadoCriado, publicado: publicou },
        message: publicou ? 'Comunicado publicado.' : 'Comunicado criado como rascunho.',
      },
      { status: 201 },
    )
  })
}

function renderizar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return render(<PublicarComunicadoGlobal />, { wrapper: Wrapper })
}

/** Preenche o mínimo que o schema exige para um comunicado global. */
async function preencherFormulario(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByRole('textbox', { name: /Título/ }), 'Instabilidade na SEFIN')
  await usuario.type(
    screen.getByRole('textbox', { name: /Corpo/ }),
    'Emissões podem demorar até as 18h.',
  )
  await usuario.type(screen.getByLabelText(/Expira em/), '2099-03-01T18:00')
}

beforeEach(() => {
  autenticarCom(['comunicados-adicionar', 'provedores-buscar'])
})

afterEach(() => {
  keycloak.tokenParsed = undefined
})

describe('PublicarComunicadoGlobal', () => {
  it('não aparece sem a role de criar comunicado', () => {
    autenticarCom(['comunicados-buscar'])
    renderizar()

    expect(screen.queryByRole('button', { name: /comunicado/i })).not.toBeInTheDocument()
  })

  it('só consulta provedores quando o modal abre — o botão está em toda tela interna', async () => {
    const usuario = userEvent.setup()
    let consultas = 0
    server.use(
      http.get(`${API_URL}/interno/provedores`, () => {
        consultas += 1
        return HttpResponse.json({
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 200,
          totalPages: 1,
        })
      }),
    )

    renderizar()
    expect(consultas).toBe(0)

    await usuario.click(screen.getByRole('button', { name: 'Novo comunicado' }))
    await waitFor(() => expect(consultas).toBe(1))
  })

  it('erro do servidor mantém o modal aberto com a mensagem inline', async () => {
    const usuario = userEvent.setup()
    server.use(
      handlerProvedores(),
      http.post(`${API_URL}/interno/comunicados`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDACAO_NEGOCIO',
              message: 'A expiração precisa ser no futuro.',
            },
          },
          { status: 422 },
        ),
      ),
    )

    renderizar()
    await usuario.click(screen.getByRole('button', { name: 'Novo comunicado' }))
    await preencherFormulario(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A expiração precisa ser no futuro.')
    // O que foi digitado continua na tela — nada de reabrir e redigitar.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Título/ })).toHaveValue('Instabilidade na SEFIN')
  })

  it('422 com details[] destaca o campo Título específico, não só a mensagem geral', async () => {
    const usuario = userEvent.setup()
    server.use(
      handlerProvedores(),
      http.post(`${API_URL}/interno/comunicados`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Um ou mais campos são inválidos.',
              details: [{ field: 'Titulo', message: 'Já existe um comunicado com este título.' }],
            },
          },
          { status: 422 },
        ),
      ),
    )

    renderizar()
    await usuario.click(screen.getByRole('button', { name: 'Novo comunicado' }))
    await preencherFormulario(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Já existe um comunicado com este título.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('validação do cliente nem chega ao servidor', async () => {
    const usuario = userEvent.setup()
    server.use(handlerProvedores())

    renderizar()
    await usuario.click(screen.getByRole('button', { name: 'Novo comunicado' }))
    // Sem handler de POST registrado: uma chamada derrubaria o teste
    // (`onUnhandledRequest: 'error'`).
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('O título é obrigatório.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('PublicarComunicadoGlobal — D-1, os três desfechos', () => {
  it('com comunicados-publicar: o rótulo promete publicação, o payload pede, e o toast repete o que o backend disse', async () => {
    const usuario = userEvent.setup()
    const capturado: { corpo: Record<string, unknown> | null } = { corpo: null }
    autenticarCom(['comunicados-adicionar', 'comunicados-publicar', 'provedores-buscar'])
    server.use(handlerProvedores(), handlerCriar(capturado))

    renderizar()
    await usuario.click(screen.getByRole('button', { name: 'Publicar comunicado' }))
    await preencherFormulario(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(capturado.corpo?.publicar).toBe(true)
    // O texto vem da `message` de I32. Um literal fixo no cliente cairia aqui ou
    // no caso do rascunho — as duas mensagens não podem ser a mesma.
    expect(screen.getByRole('status')).toHaveTextContent('Comunicado publicado.')
  })

  it('sem a role: o rótulo não promete publicação, e o toast diz que ficou em rascunho', async () => {
    const usuario = userEvent.setup()
    const capturado: { corpo: Record<string, unknown> | null } = { corpo: null }
    server.use(handlerProvedores(), handlerCriar(capturado))

    renderizar()
    expect(screen.queryByRole('button', { name: 'Publicar comunicado' })).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Novo comunicado' }))
    await preencherFormulario(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(capturado.corpo?.publicar).toBe(false)
    expect(screen.getByRole('status')).toHaveTextContent('Comunicado criado como rascunho.')
  })

  it('403 (adulteração): nada é reportado como sucesso e o modal continua aberto', async () => {
    const usuario = userEvent.setup()
    autenticarCom(['comunicados-adicionar', 'comunicados-publicar', 'provedores-buscar'])
    server.use(
      handlerProvedores(),
      // `Forbid()` do ASP.NET responde 403 SEM envelope — é a forma real, não um
      // `{ error: ... }` de conveniência.
      http.post(`${API_URL}/interno/comunicados`, () => new HttpResponse(null, { status: 403 })),
    )

    renderizar()
    await usuario.click(screen.getByRole('button', { name: 'Publicar comunicado' }))
    await preencherFormulario(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
