import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../../test/mocks/server'
import { ModalDoVerbete } from './ModalDoVerbete'

const API_URL = import.meta.env.VITE_API_URL
const ORIGEM = 'https://codex.migrate.info'

/**
 * Campos no formato de `CampoLayoutPublicoDto`, em JSON literal. A `urlCanonica` do primeiro NÃO
 * é `/layout/campos/{slug}`: o link copiado vem dela, nunca de um endereço montado à mão.
 */
const CAMPO_VALOR_DOS_SERVICOS = {
  slug: 'servico-valores-valservicos',
  nome: 'Valor dos serviços',
  caminhoXml: '//Servico/Valores/ValServicos',
  significado: 'Valor total dos serviços prestados.\nInclui os descontos condicionados.',
  ordem: 1,
  novoNestaVersao: false,
  descontinuadoNestaVersao: false,
  urlCanonica: '/layout/campos/valor-dos-servicos-canonico',
}

const CAMPO_NOVO = {
  slug: 'tomador-cnpj',
  nome: 'CNPJ do tomador',
  caminhoXml: '//Tomador/CNPJ',
  significado: 'Documento de identificação do tomador.',
  ordem: 2,
  novoNestaVersao: true,
  descontinuadoNestaVersao: false,
  urlCanonica: '/layout/campos/tomador-cnpj',
}

const CAMPO_DESCONTINUADO = {
  slug: 'servico-descricao-antiga',
  nome: 'Descrição antiga',
  caminhoXml: '//Servico/DescricaoAntiga',
  significado: 'Texto que a versão anterior aceitava.',
  ordem: 3,
  novoNestaVersao: false,
  descontinuadoNestaVersao: true,
  urlCanonica: '/layout/campos/servico-descricao-antiga',
}

const CAMPOS = [CAMPO_VALOR_DOS_SERVICOS, CAMPO_NOVO, CAMPO_DESCONTINUADO]

const USOS = [
  {
    provedorSlug: 'iss-net',
    provedorNome: 'ISS.NET',
    versaoSlug: '2-04',
    versaoRotulo: '2.04',
    destinoXml: 'DPS/infDPS/serv/vServ',
    estadoPreenchimento: 'Obrigatorio',
  },
  {
    provedorSlug: 'abrasf',
    provedorNome: 'ABRASF',
    versaoSlug: '2-03',
    versaoRotulo: '2.03',
    destinoXml: null,
    estadoPreenchimento: 'Condicional',
  },
]

function responderCampos(ondeEUsado: unknown = USOS): string[] {
  const requisitados: string[] = []

  server.use(
    http.get(`${API_URL}/layout/campos/:campoSlug`, ({ params }) => {
      const slug = String(params.campoSlug)
      requisitados.push(slug)
      const campo = CAMPOS.find((candidato) => candidato.slug === slug)!
      return HttpResponse.json({
        data: {
          ...campo,
          estado: 'Ativo',
          versaoExibicao: { slug: '8', rotulo: '8' },
          versaoOrigem: { slug: '8', rotulo: '8' },
          versaoDescontinuado: null,
          ondeEUsado,
        },
        message: null,
      })
    }),
  )

  return requisitados
}

/** Faz o papel da tela da versão: guarda o campo aberto e navega entre os vizinhos. */
function PaginaDeTeste() {
  const [indice, setIndice] = useState(0)
  const campo = CAMPOS[indice]
  const anterior = CAMPOS[indice - 1]
  const proximo = CAMPOS[indice + 1]

  function irParaSlug(slug: string) {
    setIndice(CAMPOS.findIndex((candidato) => candidato.slug === slug))
  }

  return (
    <ModalDoVerbete
      campo={campo}
      trilha="Serviço › Valores"
      versaoRotulo="8"
      posicao={indice + 1}
      total={CAMPOS.length}
      filtroAtivo={false}
      anterior={anterior ? { slug: anterior.slug, nome: anterior.nome } : null}
      proximo={proximo ? { slug: proximo.slug, nome: proximo.nome } : null}
      onNavegar={irParaSlug}
      onFechar={vi.fn()}
      devolverFoco={vi.fn()}
      linkDoCampo={`${ORIGEM}${campo.urlCanonica}`}
    />
  )
}

function renderizar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({ getParentRoute: () => rootRoute, path: '/', component: PaginaDeTeste })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function secaoDeUsosDentro(dialogo: HTMLElement) {
  return within(dialogo).getByRole('region', { name: 'Como cada provedor usa este campo' })
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ModalDoVerbete — conteúdo', () => {
  it('mostra, nesta ordem, o significado, o caminho no Layout InvoiCy e os usos por provedor', async () => {
    responderCampos()
    renderizar()

    const dialogo = await screen.findByRole('dialog', { name: 'Valor dos serviços' })
    const secaoDeUsos = secaoDeUsosDentro(dialogo)
    const significado = within(dialogo).getByText(/Valor total dos serviços prestados\./)
    const painelDoCaminho = within(dialogo).getByRole('region', { name: 'No Layout InvoiCy' })

    const vem = (antes: Element, depois: Element) =>
      Boolean(antes.compareDocumentPosition(depois) & Node.DOCUMENT_POSITION_FOLLOWING)

    expect(vem(significado, painelDoCaminho)).toBe(true)
    expect(vem(painelDoCaminho, secaoDeUsos)).toBe(true)
  })

  it('o botão do painel copia o caminho que está à vista, literal', async () => {
    responderCampos()
    const usuario = userEvent.setup()
    const copiar = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    renderizar()

    await screen.findByRole('dialog', { name: 'Valor dos serviços' })
    await usuario.click(
      screen.getByRole('button', {
        name: 'Copiar caminho do campo Valor dos serviços no InvoiCy',
      }),
    )

    expect(copiar).toHaveBeenCalledWith('//Servico/Valores/ValServicos')
  })

  it('"Copiar link do campo" copia o endereço da urlCanonica, não um montado à mão', async () => {
    responderCampos()
    const usuario = userEvent.setup()
    const copiar = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    renderizar()

    await screen.findByRole('dialog', { name: 'Valor dos serviços' })
    await usuario.click(
      screen.getByRole('button', { name: 'Copiar link do campo Valor dos serviços' }),
    )

    expect(copiar).toHaveBeenCalledWith(
      'https://codex.migrate.info/layout/campos/valor-dos-servicos-canonico',
    )
  })

  it('fora da seção de usos não há Tipo, Tamanho, Máscara nem Obrigatório', async () => {
    responderCampos()
    renderizar()

    const dialogo = await screen.findByRole('dialog', { name: 'Valor dos serviços' })
    const secaoDeUsos = secaoDeUsosDentro(dialogo)
    // A etiqueta de obrigatoriedade existe, mas só lá dentro.
    expect(await within(secaoDeUsos).findByText('Obrigatório')).toBeInTheDocument()

    const foraDosUsos = dialogo.cloneNode(true) as HTMLElement
    foraDosUsos.querySelectorAll('section').forEach((secao) => {
      if (secao.textContent?.startsWith('Como cada provedor usa este campo')) secao.remove()
    })

    expect(foraDosUsos.textContent).not.toMatch(/Tipo|Tamanho|Máscara|Obrigat/)
  })

  it('os usos com erro não derrubam o resto: significado e caminho continuam à vista', async () => {
    server.use(
      http.get(`${API_URL}/layout/campos/:campoSlug`, () =>
        HttpResponse.json({ error: { code: 'ERRO_INTERNO' } }, { status: 500 }),
      ),
    )
    renderizar()

    const dialogo = await screen.findByRole('dialog', { name: 'Valor dos serviços' })

    expect(
      await within(secaoDeUsosDentro(dialogo)).findByText(
        'Não foi possível carregar os provedores deste campo.',
      ),
    ).toBeInTheDocument()
    expect(within(dialogo).getByText(/Valor total dos serviços prestados\./)).toBeInTheDocument()
    expect(within(dialogo).getByRole('region', { name: 'No Layout InvoiCy' })).toBeInTheDocument()
  })
})

describe('ModalDoVerbete — selos', () => {
  it('"novo na versão 8" aparece só no campo novo; "Descontinuado nesta versão" só no descontinuado', async () => {
    responderCampos([])
    renderizar()

    await screen.findByRole('dialog', { name: 'Valor dos serviços' })
    expect(screen.queryByText('novo na versão 8')).toBeNull()
    expect(screen.queryByText('Descontinuado nesta versão')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Próximo campo' }))
    await screen.findByRole('dialog', { name: 'CNPJ do tomador' })
    expect(screen.getByText('novo na versão 8')).toBeInTheDocument()
    expect(screen.queryByText('Descontinuado nesta versão')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Próximo campo' }))
    await screen.findByRole('dialog', { name: 'Descrição antiga' })
    expect(screen.getByText('Descontinuado nesta versão')).toBeInTheDocument()
    expect(screen.queryByText('novo na versão 8')).toBeNull()
  })
})

describe('ModalDoVerbete — navegação e consulta dos usos', () => {
  async function avancar(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }

  it('navegar pelo "Próximo campo" muda o título já, mas só consulta os usos depois de 250 ms', async () => {
    const requisitados = responderCampos()
    renderizar()

    // O router monta com o relógio real; o falso entra depois, só para o atraso do hook.
    await screen.findByRole('dialog', { name: 'Valor dos serviços' })
    await waitFor(() => expect(requisitados).toEqual(['servico-valores-valservicos']))
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    fireEvent.click(screen.getByRole('button', { name: 'Próximo campo' }))

    expect(screen.getByRole('dialog', { name: 'CNPJ do tomador' })).toBeInTheDocument()

    await avancar(249)
    expect(requisitados).toEqual(['servico-valores-valservicos'])

    await avancar(1)
    await vi.waitFor(() =>
      expect(requisitados).toEqual(['servico-valores-valservicos', 'tomador-cnpj']),
    )
  })
})
