import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useAncoraDaEstrutura } from './useAncoraDaEstrutura'

const SEM_ANCORAS = new Map()
const SEM_GRUPOS = () => {}

function EstruturaDeTeste(): JSX.Element {
  useAncoraDaEstrutura({ slugAncora: null, ancoras: SEM_ANCORAS, abrirGrupos: SEM_GRUPOS })
  return <p>estrutura montada</p>
}

function renderEstrutura() {
  const router = createRouter({
    routeTree: createRootRoute({ component: EstruturaDeTeste }),
    history: createMemoryHistory({ initialEntries: ['/layout/9?visao=xml'] }),
  })
  return render(<RouterProvider router={router} />)
}

afterEach(() => {
  window.history.scrollRestoration = 'auto'
})

describe('useAncoraDaEstrutura', () => {
  it('liga o modo manual na estrutura e devolve "auto" ao sair, mesmo se já entrou em manual', async () => {
    // Voltar a uma entrada da estrutura traz o 'manual' gravado nela na visita anterior.
    window.history.scrollRestoration = 'manual'
    const { unmount } = renderEstrutura()
    await screen.findByText('estrutura montada')
    expect(window.history.scrollRestoration).toBe('manual')

    unmount()

    expect(window.history.scrollRestoration).toBe('auto')
  })
})
