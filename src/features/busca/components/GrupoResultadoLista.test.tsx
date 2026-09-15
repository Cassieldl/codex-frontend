import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GrupoResultado, ResultadoItem } from '../types/resultadoBusca'
import { GrupoResultadoLista } from './GrupoResultadoLista'

function criarItem(sobrescritas: Partial<ResultadoItem> = {}): ResultadoItem {
  return {
    tipo: 'erro',
    rotulo: 'Erro',
    chave: 'e0117',
    titulo: 'E0117 — CNPJ inválido',
    url: '/erros/e0117',
    provedorNome: null,
    versaoRotulo: null,
    versoes: null,
    descricaoCasamento: 'Correspondência exata',
    publicado: true,
    meta: null,
    pontuacao: 1,
    trechos: [{ texto: 'CNPJ inválido', destacado: false }],
    ...sobrescritas,
  }
}

function criarGrupo(itens: ResultadoItem[]): GrupoResultado {
  return { tipo: 'erro', rotulo: 'Erros', total: itens.length, pontuacao: 1, itens }
}

// `GrupoResultadoLista` monta `<Link>` do TanStack Router para item com URL
// válida — precisa de `RouterProvider` real, mesmo padrão de `busca-index.test.tsx`.
function renderComRouter(grupo: GrupoResultado) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pagina',
    component: () => <GrupoResultadoLista grupo={grupo} />,
  })
  const routeTree = rootRoute.addChildren([rota])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/pagina'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('GrupoResultadoLista — descricaoCasamento e meta por item (P1/I21)', () => {
  it('mostra descricaoCasamento e meta formatado juntos, separados por "·"', async () => {
    renderComRouter(criarGrupo([criarItem({ meta: { tipo: 'verificacao', data: '2026-05-12' } })]))

    expect(
      await screen.findByText('Correspondência exata · Verificado em 12/05/2026'),
    ).toBeInTheDocument()
  })

  it('mostra só descricaoCasamento quando não há meta', async () => {
    renderComRouter(criarGrupo([criarItem({ meta: null })]))

    expect(await screen.findByText('Correspondência exata')).toBeInTheDocument()
  })

  it('nunca mostra descricaoCasamento no cabeçalho do grupo — só o rótulo e o total', async () => {
    renderComRouter(criarGrupo([criarItem({})]))

    const titulo = await screen.findByRole('heading', { level: 2 })
    expect(titulo).toHaveTextContent('Erros (1)')
    expect(titulo).not.toHaveTextContent('Correspondência exata')
  })
})
