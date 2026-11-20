import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { server } from '../../../test/mocks/server'
import { useCampoDestacadoPorAncora } from '../../provedores/utils/destaqueAncora'
import { DicionarioDaVersao } from './DicionarioDaVersao'

/**
 * Âncora `#campo-…` com o histórico DO NAVEGADOR, como em produção: é ele que o router observa, e o
 * histórico em memória dos outros testes esconde os dois defeitos daqui (foco que não volta ao link
 * e página que vai ao topo ao fechar o verbete).
 */
const API_URL = import.meta.env.VITE_API_URL

const TOMA_CNPJ = {
  slug: 'tomador-tomacnpj',
  nome: 'TomaCNPJ',
  caminhoXml: '//Tomador/TomaCNPJ',
  significado: 'CNPJ do tomador.',
  ordem: 330,
  reformaTributaria: false,
  novoNestaVersao: false,
  descontinuadoNestaVersao: false,
  urlCanonica: '/layout/campos/tomador-tomacnpj',
}

const DISCRIMINACAO = {
  slug: 'servico-discriminacao',
  nome: 'Discriminacao',
  caminhoXml: '//Servico/Discriminacao',
  significado: 'Discriminação dos serviços realizados.',
  ordem: 148,
  reformaTributaria: false,
  novoNestaVersao: false,
  descontinuadoNestaVersao: false,
  urlCanonica: '/layout/campos/servico-discriminacao',
}

const CAMPOS_POR_GRUPO = [
  { grupo: 'Servico', grupoSlug: 'servico', campos: [DISCRIMINACAO] },
  { grupo: 'Tomador', grupoSlug: 'tomador', campos: [TOMA_CNPJ] },
]

const VERSAO_8 = { slug: '8', rotulo: '8', estado: 'Vigente', ordem: 3, totalCampos: 2 }

function responderCampoLayout() {
  return http.get(`${API_URL}/layout/campos/:slug`, ({ params }) => {
    const campo = [TOMA_CNPJ, DISCRIMINACAO].find((candidato) => candidato.slug === params.slug)
    if (!campo) return HttpResponse.json({ error: { code: 'NAO_ENCONTRADO' } }, { status: 404 })

    return HttpResponse.json({
      data: {
        ...campo,
        estado: 'Ativo',
        versaoExibicao: VERSAO_8,
        versaoOrigem: VERSAO_8,
        versaoDescontinuado: null,
        ondeEUsado: [],
      },
      message: null,
    })
  })
}

/** Link da página, fora do dicionário, que leva ao campo pela âncora (como um aviso do provedor). */
function Hospedeiro() {
  const campoDestacado = useCampoDestacadoPorAncora()

  return (
    <>
      <a href="#campo-tomador-tomacnpj">Ver TomaCNPJ</a>
      <DicionarioDaVersao
        versaoRotulo="8"
        totalCampos={2}
        camposPorGrupo={CAMPOS_POR_GRUPO}
        origemUrl="https://codex.migrate.info"
        campoDestacado={campoDestacado}
      />
    </>
  )
}

async function renderizar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaDoDicionario = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: Hospedeiro,
  })
  const router = createRouter({ routeTree: rootRoute.addChildren([rotaDoDicionario]) })
  // O histórico do navegador troca o replaceState da janela: sem desfazer, vaza para o próximo teste.
  desfazerHistorico = () => router.history.destroy()

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { level: 2, name: 'Dicionário de campos' })

  return router
}

let rolarJanela: MockInstance<typeof window.scrollTo>
let desfazerHistorico: (() => void) | null = null

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  Element.prototype.scrollIntoView = vi.fn()
  rolarJanela = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  server.use(responderCampoLayout())
})

afterEach(() => {
  cleanup()
  desfazerHistorico?.()
  desfazerHistorico = null
  vi.restoreAllMocks()
})

describe('DicionarioDaVersao: verbete aberto pela âncora, com o histórico do navegador', () => {
  it('Esc devolve o foco ao link clicado, mesmo com o foco fora dele quando o hash muda', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    const link = screen.getByRole('link', { name: 'Ver TomaCNPJ' })
    // O Chrome tira o foco do link antes do `hashchange`: o jsdom não faz isso sozinho.
    link.addEventListener('click', () => link.blur())

    await usuario.click(link)
    await screen.findByRole('dialog', { name: 'TomaCNPJ' })

    await usuario.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(link)
  })

  it('fechar o verbete limpa o hash sem levar a página ao topo', async () => {
    const usuario = userEvent.setup()
    const router = await renderizar()

    window.location.hash = '#campo-tomador-tomacnpj'
    await screen.findByRole('dialog', { name: 'TomaCNPJ' })
    rolarJanela.mockClear()

    await usuario.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(window.location.hash).toBe(''))
    await waitFor(() => expect(router.state.status).toBe('idle'))
    expect(rolarJanela).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'TomaCNPJ' }))
  })
})
