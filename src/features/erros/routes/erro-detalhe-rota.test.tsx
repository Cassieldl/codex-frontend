import { createRoute } from '@tanstack/react-router'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { handlerErroDetalhePadrao } from '../../../test/mocks/handlers'
import { server } from '../../../test/mocks/server'
import {
  criarPortao,
  renderComDestinoLento,
  sairDaPaginaEEsperarDestino,
} from '../../../test/saidaDaPagina'
import { ErroDetalheRota } from './erro-detalhe-rota'

const API_URL = import.meta.env.VITE_API_URL

/** Corpo de `GET /erros/{slug}` — o slug do corpo é o canônico, seja qual for o slug pedido. */
function erroComSlug(slug: string) {
  return {
    slug,
    codigo: slug.toUpperCase(),
    origem: 'Schema',
    titulo: `Erro ${slug}`,
    variantes: [],
    causaProvavel: null,
    solucaoSugerida: null,
    versoesAplicaveis: [],
    camposRelacionados: [],
    artigosRelacionados: [],
  }
}

function renderRota(entradas: string[], portao = criarPortao()) {
  const utils = renderComDestinoLento({
    entradas,
    portao,
    rotasDaPagina: (rotaRaiz) => [
      createRoute({
        getParentRoute: () => rotaRaiz,
        path: '/erros/$erroSlug',
        component: ErroDetalheRota,
      }),
    ],
  })

  return { ...utils, portao }
}

describe('ErroDetalheRota — sair da página não é desfeito pela correção de URL', () => {
  it('ao navegar para outra tela enquanto ela carrega, a URL termina no destino', async () => {
    server.use(handlerErroDetalhePadrao('e0117'))
    const { router, portao } = renderRota(['/erros/e0117'])
    await screen.findByRole('heading', { level: 1, name: 'E0117' })

    await sairDaPaginaEEsperarDestino({
      router,
      portao,
      sair: () => router.history.push('/layout/8'),
      caminhoDeDestino: '/layout/8',
    })
  })

  it('ao voltar no histórico enquanto a tela anterior carrega, a URL termina nela', async () => {
    server.use(handlerErroDetalhePadrao('e0117'))
    const { router, portao } = renderRota(['/layout/8', '/erros/e0117'])
    await screen.findByRole('heading', { level: 1, name: 'E0117' })

    await sairDaPaginaEEsperarDestino({
      router,
      portao,
      sair: () => router.history.back(),
      caminhoDeDestino: '/layout/8',
    })
  })
})

describe('ErroDetalheRota — slug desatualizado', () => {
  it('troca a entrada do histórico pelo slug canônico, sem empilhar o endereço morto', async () => {
    server.use(
      http.get(`${API_URL}/erros/e0117-slug-antigo`, () =>
        HttpResponse.json({ data: erroComSlug('e0117-slug-novo'), message: null }),
      ),
      handlerErroDetalhePadrao('e0117-slug-novo'),
    )
    const portao = criarPortao()
    portao.liberar()
    const { router } = renderRota(['/layout/8', '/erros/e0117-slug-antigo'], portao)

    await screen.findByRole('heading', { level: 1, name: 'E0117-SLUG-NOVO' })
    expect(router.state.location.pathname).toBe('/erros/e0117-slug-novo')

    router.history.back()

    await waitFor(() => expect(router.state.location.pathname).toBe('/layout/8'))
  })
})
