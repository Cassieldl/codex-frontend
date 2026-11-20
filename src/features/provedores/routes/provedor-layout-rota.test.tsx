import { createRoute } from '@tanstack/react-router'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { handlerComunicadosRegistrandoChamadas } from '../../../test/mocks/comunicadosContexto'
import { server } from '../../../test/mocks/server'
import {
  TITULO_DESTINO,
  criarPortao,
  renderComDestinoLento,
  sairDaPaginaEEsperarDestino,
} from '../../../test/saidaDaPagina'
import { ProvedorLayoutRota } from './provedor-layout-rota'
import { redirecionarVersaoParaProvedor } from './redirecionar-versao'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de ProvedorDetalheDto, sem o tipo do cliente.
function provedorComSlug(slug: string) {
  return {
    slug,
    nome: `Provedor ${slug}`,
    categoria: 'Nacional',
    identificadorInvoicy: 'EXEMPLO',
    avisos: [],
    versoes: [
      {
        slug: 'v1',
        rotulo: 'Versão 1',
        verificadoEm: '2026-07-01',
        url: `/provedores/${slug}/v1`,
      },
    ],
  }
}

function handlerProvedor(slugRequisitado: string, provedor: object) {
  return http.get(`${API_URL}/provedores/${slugRequisitado}`, () =>
    HttpResponse.json({ data: provedor, message: null }),
  )
}

/** A mesma forma da árvore real: layout do provedor, abas e o endereço antigo com versão. */
function renderRota(entradas: string[], portao = criarPortao()) {
  const utils = renderComDestinoLento({
    entradas,
    portao,
    rotasDaPagina: (rotaRaiz) => {
      const rotaProvedor = createRoute({
        getParentRoute: () => rotaRaiz,
        path: '/provedores/$provedorSlug',
        component: ProvedorLayoutRota,
      })
      const rotaIndice = createRoute({
        getParentRoute: () => rotaProvedor,
        path: '/',
        component: () => null,
      })
      const rotasDasAbas = ['campos', 'natureza-da-operacao', 'envio-modelo'].map((segmento) =>
        createRoute({ getParentRoute: () => rotaProvedor, path: segmento, component: () => null }),
      )
      const rotaVersao = createRoute({
        getParentRoute: () => rotaProvedor,
        path: '$versaoSlug',
        beforeLoad: redirecionarVersaoParaProvedor,
      })

      return [rotaProvedor.addChildren([rotaIndice, ...rotasDasAbas, rotaVersao])]
    },
  })

  return { ...utils, portao }
}

describe('ProvedorLayoutRota: sair da página não é desfeito pela correção de URL', () => {
  it('"Layout InvoiCy" no cabeçalho termina em /layout', async () => {
    server.use(handlerProvedor('ipm', provedorComSlug('ipm')))
    const { router, portao } = renderRota(['/provedores/ipm'])
    await screen.findByRole('heading', { level: 1, name: 'Provedor ipm' })

    await sairDaPaginaEEsperarDestino({
      router,
      portao,
      sair: () =>
        userEvent.click(
          within(screen.getByRole('banner')).getByRole('link', { name: 'Layout InvoiCy' }),
        ),
      caminhoDeDestino: '/layout',
    })
  })

  it('ao sair depois de chegar por um endereço antigo com versão, a URL termina no destino', async () => {
    server.use(handlerProvedor('ipm', provedorComSlug('ipm')))
    const { router, portao } = renderRota(['/provedores/ipm/v1'])
    await screen.findByRole('heading', { level: 1, name: 'Provedor ipm' })

    await sairDaPaginaEEsperarDestino({
      router,
      portao,
      sair: () => router.history.push('/layout/8'),
      caminhoDeDestino: '/layout/8',
    })
  })

  it('ao voltar no histórico enquanto a tela anterior carrega, a URL termina nela', async () => {
    server.use(handlerProvedor('ipm', provedorComSlug('ipm')))
    const { router, portao } = renderRota(['/layout/8', '/provedores/ipm'])
    await screen.findByRole('heading', { level: 1, name: 'Provedor ipm' })

    await sairDaPaginaEEsperarDestino({
      router,
      portao,
      sair: () => router.history.back(),
      caminhoDeDestino: '/layout/8',
    })
  })
})

describe('ProvedorLayoutRota: endereço antigo com versão', () => {
  it('vira /provedores/{slug} mantendo a âncora, sem deixar o endereço antigo no histórico', async () => {
    server.use(handlerProvedor('ipm', provedorComSlug('ipm')))
    const portao = criarPortao()
    portao.liberar()
    const { router } = renderRota(['/layout/8', '/provedores/ipm/v1#avisos'], portao)

    await screen.findByRole('heading', { level: 1, name: 'Provedor ipm' })
    expect(router.state.location.pathname).toBe('/provedores/ipm')
    expect(router.state.location.hash).toBe('avisos')

    router.history.back()

    await waitFor(() => expect(router.state.location.pathname).toBe('/layout/8'))
  })

  it('link antigo seguido de dentro do portal vai direto para a aba da âncora, sem empilhar o endereço com versão', async () => {
    server.use(handlerProvedor('ipm', provedorComSlug('ipm')))
    const portao = criarPortao()
    portao.liberar()
    const { router } = renderRota(['/layout/8'], portao)
    await screen.findByRole('heading', { name: TITULO_DESTINO })

    router.history.push('/provedores/ipm/v1#campo-cnpj-tomador')

    await screen.findByRole('heading', { level: 1, name: 'Provedor ipm' })
    expect(router.state.location.pathname).toBe('/provedores/ipm/campos')
    expect(router.state.location.hash).toBe('campo-cnpj-tomador')

    router.history.back()

    await waitFor(() => expect(router.state.location.pathname).toBe('/layout/8'))
  })

  it('os comunicados levam a versão publicada, com ou sem versão no endereço', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([])
    server.use(handlerProvedor('ipm', provedorComSlug('ipm')), handler)
    renderRota(['/provedores/ipm/versao-que-nao-existe'])

    await screen.findByRole('heading', { level: 1, name: 'Provedor ipm' })

    await waitFor(() => expect(chamadas).toHaveLength(1))
    expect(chamadas[0].searchParams.get('versao')).toBe('v1')
  })
})

describe('ProvedorLayoutRota: slug desatualizado', () => {
  it('troca a entrada do histórico pelo slug canônico, sem empilhar o endereço morto', async () => {
    server.use(
      handlerProvedor('slug-antigo', provedorComSlug('slug-novo')),
      handlerProvedor('slug-novo', provedorComSlug('slug-novo')),
    )
    const portao = criarPortao()
    portao.liberar()
    const { router } = renderRota(['/layout/8', '/provedores/slug-antigo'], portao)

    await screen.findByRole('heading', { level: 1, name: 'Provedor slug-novo' })
    expect(router.state.location.pathname).toBe('/provedores/slug-novo')

    router.history.back()

    await waitFor(() => expect(router.state.location.pathname).toBe('/layout/8'))
  })

  it('endereço antigo com versão e slug desatualizado termina no slug canônico, sem versão', async () => {
    server.use(
      handlerProvedor('slug-antigo', provedorComSlug('slug-novo')),
      handlerProvedor('slug-novo', provedorComSlug('slug-novo')),
    )
    const { router } = renderRota(['/provedores/slug-antigo/v1'])

    await screen.findByRole('heading', { level: 1, name: 'Provedor slug-novo' })

    expect(router.state.location.pathname).toBe('/provedores/slug-novo')
  })
})
