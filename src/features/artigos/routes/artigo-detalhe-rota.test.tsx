import { createRoute } from '@tanstack/react-router'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { handlerArtigoDetalhe } from '../../../test/mocks/handlers'
import { server } from '../../../test/mocks/server'
import {
  criarPortao,
  renderComDestinoLento,
  sairDaPaginaEEsperarDestino,
} from '../../../test/saidaDaPagina'
import { ArtigoDetalheRota } from './artigo-detalhe-rota'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de ArtigoDetalheDto, sem o tipo do cliente.
function artigoComSlug(slug: string) {
  return {
    slug,
    tipo: 'Procedimento',
    titulo: `Artigo ${slug}`,
    corpo: 'Corpo do artigo.',
    verificadoEm: '2026-08-14',
    urlCanonica: `/artigos/${slug}`,
    reservado: false,
    camposLayoutRelacionados: [],
    errosRelacionados: [],
  }
}

function renderRota(entradas: string[], portao = criarPortao()) {
  const utils = renderComDestinoLento({
    entradas,
    portao,
    rotasDaPagina: (rotaRaiz) => [
      createRoute({
        getParentRoute: () => rotaRaiz,
        path: '/artigos/$artigoSlug',
        component: ArtigoDetalheRota,
      }),
    ],
  })

  return { ...utils, portao }
}

describe('ArtigoDetalheRota: sair da página não é desfeito pela correção de URL', () => {
  it('ao navegar para outra tela enquanto ela carrega, a URL termina no destino', async () => {
    server.use(handlerArtigoDetalhe(artigoComSlug('identificar-a-versao')))
    const { router, portao } = renderRota(['/artigos/identificar-a-versao'])
    await screen.findByRole('heading', { level: 1, name: 'Artigo identificar-a-versao' })

    await sairDaPaginaEEsperarDestino({
      router,
      portao,
      sair: () => router.history.push('/layout/8'),
      caminhoDeDestino: '/layout/8',
    })
  })

  it('ao voltar no histórico enquanto a tela anterior carrega, a URL termina nela', async () => {
    server.use(handlerArtigoDetalhe(artigoComSlug('identificar-a-versao')))
    const { router, portao } = renderRota(['/layout/8', '/artigos/identificar-a-versao'])
    await screen.findByRole('heading', { level: 1, name: 'Artigo identificar-a-versao' })

    await sairDaPaginaEEsperarDestino({
      router,
      portao,
      sair: () => router.history.back(),
      caminhoDeDestino: '/layout/8',
    })
  })
})

describe('ArtigoDetalheRota: slug desatualizado', () => {
  it('troca a entrada do histórico pelo slug canônico, sem empilhar o endereço morto', async () => {
    server.use(
      http.get(`${API_URL}/artigos/slug-antigo`, () =>
        HttpResponse.json({ data: artigoComSlug('slug-novo'), message: null }),
      ),
      handlerArtigoDetalhe(artigoComSlug('slug-novo')),
    )
    const portao = criarPortao()
    portao.liberar()
    const { router } = renderRota(['/layout/8', '/artigos/slug-antigo'], portao)

    await screen.findByRole('heading', { level: 1, name: 'Artigo slug-novo' })
    expect(router.state.location.pathname).toBe('/artigos/slug-novo')

    router.history.back()

    await waitFor(() => expect(router.state.location.pathname).toBe('/layout/8'))
  })
})
