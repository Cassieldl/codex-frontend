import { createRoute } from '@tanstack/react-router'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { handlerComunicadosRegistrandoChamadas } from '../../../test/mocks/comunicadosContexto'
import { server } from '../../../test/mocks/server'
import {
  criarPortao,
  renderComDestinoLento,
  sairDaPaginaEEsperarDestino,
} from '../../../test/saidaDaPagina'
import { ProvedorLayoutRota } from './provedor-layout-rota'

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

/** A mesma forma da árvore real: layout do provedor com o índice e a versão aberta dentro dele. */
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
      const rotaVersao = createRoute({
        getParentRoute: () => rotaProvedor,
        path: '$versaoSlug',
        component: () => null,
      })

      return [rotaProvedor.addChildren([rotaIndice, rotaVersao])]
    },
  })

  return { ...utils, portao }
}

describe('ProvedorLayoutRota — sair da página não é desfeito pela correção de URL', () => {
  it('"Layout InvoiCy" no cabeçalho termina em /layout', async () => {
    server.use(handlerProvedor('ipm', provedorComSlug('ipm')))
    const { router, portao } = renderRota(['/provedores/ipm'])
    await screen.findByRole('heading', { level: 1, name: 'Provedor ipm' })

    await sairDaPaginaEEsperarDestino({
      router,
      portao,
      sair: () => userEvent.click(screen.getByRole('link', { name: 'Layout InvoiCy' })),
      caminhoDeDestino: '/layout',
    })
  })

  it('ao sair de uma versão aberta, a URL termina no destino', async () => {
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

describe('ProvedorLayoutRota — versão aberta', () => {
  it('leva a versão que está na URL para a página', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([])
    server.use(handlerProvedor('ipm', provedorComSlug('ipm')), handler)
    renderRota(['/provedores/ipm/v1'])

    await screen.findByRole('heading', { level: 1, name: 'Provedor ipm' })

    await waitFor(() => expect(chamadas).toHaveLength(1))
    expect(chamadas[0].searchParams.get('versao')).toBe('v1')
  })

  it('sem versão na URL, a página não recebe versão', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([])
    server.use(handlerProvedor('ipm', provedorComSlug('ipm')), handler)
    renderRota(['/provedores/ipm'])

    await screen.findByRole('heading', { level: 1, name: 'Provedor ipm' })

    await waitFor(() => expect(chamadas).toHaveLength(1))
    expect(chamadas[0].searchParams.get('versao')).toBeNull()
  })
})

describe('ProvedorLayoutRota — slug desatualizado', () => {
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

  it('preserva a versão aberta ao corrigir o slug do provedor', async () => {
    server.use(
      handlerProvedor('slug-antigo', provedorComSlug('slug-novo')),
      handlerProvedor('slug-novo', provedorComSlug('slug-novo')),
    )
    const { router } = renderRota(['/provedores/slug-antigo/v1'])

    await screen.findByRole('heading', { level: 1, name: 'Provedor slug-novo' })

    expect(router.state.location.pathname).toBe('/provedores/slug-novo/v1')
  })
})
