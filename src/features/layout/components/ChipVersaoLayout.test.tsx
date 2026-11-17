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
import { ChipVersaoLayout, type ChipVersaoLayoutProps } from './ChipVersaoLayout'

const SEM_MARCOS_NEM_MUDANCAS = {
  normaOrigem: null,
  homologacaoDesde: null,
  liberadaNoInvoicyEm: null,
  obrigatoriaEm: null,
  mudancas: [],
}

const ANCORA = 'rota montada'

function renderChip(props: ChipVersaoLayoutProps) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <>
        <p>{ANCORA}</p>
        <ChipVersaoLayout {...props} />
      </>
    ),
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('ChipVersaoLayout', () => {
  it('escreve "Versão" antes do número e mantém o nome acessível do link', async () => {
    renderChip({
      versao: {
        slug: '4-12',
        rotulo: '4.12',
        estado: 'Vigente',
        ordem: 2,
        totalCampos: 545,
        ...SEM_MARCOS_NEM_MUDANCAS,
      },
    })

    const link = await screen.findByRole('link', { name: 'Ver o dicionário da versão 4.12' })
    expect(link).toHaveTextContent('Versão 4.12')
    expect(link).toHaveAttribute('href', '/layout/4-12')
  })

  // O rótulo vem do cadastro e pode já trazer a palavra: ela não se repete nem no texto nem no nome.
  it('não repete a palavra quando o rótulo do dado já a traz', async () => {
    renderChip({
      versao: {
        slug: '4-12',
        rotulo: 'Versão 4.12',
        estado: 'Vigente',
        ordem: 2,
        totalCampos: 1,
        ...SEM_MARCOS_NEM_MUDANCAS,
      },
    })

    const link = await screen.findByRole('link', { name: 'Ver o dicionário da versão 4.12' })
    expect(link).toHaveTextContent('Versão 4.12')
    expect(link.textContent).not.toMatch(/vers[aã]o\s+vers[aã]o/i)
  })

  // O estado vem escrito no chip; a borda é a mesma em qualquer estado.
  it('vigente e anterior têm a mesma borda e se distinguem pelo texto', async () => {
    renderChip({
      versao: {
        slug: '9',
        rotulo: '9',
        estado: 'Vigente',
        ordem: 2,
        totalCampos: 1,
        ...SEM_MARCOS_NEM_MUDANCAS,
      },
    })
    const vigente = await screen.findByRole('link', { name: /versão 9/ })
    const classesDaVigente = vigente.className

    expect(vigente).toHaveTextContent('Vigente')
    expect(vigente.className).not.toMatch(/border-dashed|border-\[/)

    renderChip({
      versao: {
        slug: '8',
        rotulo: '8',
        estado: 'Anterior',
        ordem: 1,
        totalCampos: 1,
        ...SEM_MARCOS_NEM_MUDANCAS,
      },
    })
    const anterior = await screen.findByRole('link', { name: /versão 8/ })

    expect(anterior).toHaveTextContent('Anterior')
    expect(anterior.className).toBe(classesDaVigente)
  })

  it('marca a versão aberta como página atual', async () => {
    renderChip({
      versao: {
        slug: '4-12',
        rotulo: '4.12',
        estado: 'Vigente',
        ordem: 2,
        totalCampos: 1,
        ...SEM_MARCOS_NEM_MUDANCAS,
      },
      ativa: true,
    })

    expect(await screen.findByRole('link', { name: /4\.12/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})
