import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { ErroDoCampo } from '../types/versaoProvedorPagina'
import { IndicadorErrosDoCampo } from './IndicadorErrosDoCampo'

/** Âncora de montagem: sob `RouterProvider` a árvore sobe de forma assíncrona. */
const ANCORA = 'linha da tabela'

function renderComRouter(conteudo: ReactNode) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaPagina = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pagina',
    component: () => (
      <>
        <span>{ANCORA}</span>
        {conteudo}
      </>
    ),
  })
  // Sem o destino no tree o `<Link>` não teria para onde apontar e o href sairia errado.
  const rotaErro = createRoute({
    getParentRoute: () => rootRoute,
    path: '/erros/$erroSlug',
    component: () => null,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rotaPagina, rotaErro]),
    history: createMemoryHistory({ initialEntries: ['/pagina'] }),
  })

  return render(<RouterProvider router={router} />)
}

const E1023: ErroDoCampo = { slug: 'e-1023-inscricao-municipal', codigo: 'E-1023' }
const E2145: ErroDoCampo = { slug: 'e-2145-iss-retido', codigo: 'E-2145' }

describe('IndicadorErrosDoCampo', () => {
  it('leva ao erro, com o código à vista', async () => {
    renderComRouter(<IndicadorErrosDoCampo erros={[E1023]} nomeDoCampo="Inscrição Municipal" />)
    await screen.findByText(ANCORA)

    const indicador = screen.getByRole('link', {
      name: 'Rejeição E-1023 registrada no campo Inscrição Municipal',
    })

    expect(indicador).toHaveAttribute('href', '/erros/e-1023-inscricao-municipal')
    expect(indicador).toHaveTextContent('E-1023')
  })

  it('lista uma referência por erro quando há mais de um', async () => {
    renderComRouter(
      <IndicadorErrosDoCampo erros={[E1023, E2145]} nomeDoCampo="Inscrição Municipal" />,
    )
    await screen.findByText(ANCORA)

    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  /**
   * Asserção de ausência precisa da âncora antes: sem ela o container está vazio no instante da
   * checagem, seja qual for o componente — passaria até com o indicador renderizando.
   *
   * <p>
   * E precisa afirmar sobre o ÍCONE, não só sobre o link. Sem o `return null`, um campo sem
   * rejeição ainda renderiza o triângulo de alerta sozinho — um sinal de risco em toda linha da
   * tabela, apontando para nada. Provado por mutação: a asserção só de `link` passava com esse
   * defeito presente, porque o ícone é `aria-hidden` e não tem papel acessível.
   * </p>
   */
  it('não renderiza nada quando o campo não tem rejeição', async () => {
    const { container } = renderComRouter(
      <IndicadorErrosDoCampo erros={[]} nomeDoCampo="Razão Social" />,
    )
    await screen.findByText(ANCORA)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
  })

  /**
   * O rótulo acessível nomeia o campo porque é lido FORA da linha: no leitor de tela, "E-1023"
   * sozinho não diz sobre qual dos campos da tabela é a rejeição.
   */
  it('nomeia o campo no rótulo acessível, não só o código', async () => {
    renderComRouter(<IndicadorErrosDoCampo erros={[E1023]} nomeDoCampo="Alíquota do ISS" />)
    await screen.findByText(ANCORA)

    expect(
      screen.getByRole('link', { name: /registrada no campo Alíquota do ISS$/ }),
    ).toBeInTheDocument()
  })
})
