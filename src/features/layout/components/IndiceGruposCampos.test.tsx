import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IndiceGruposCampos, type GrupoIndiceCampos } from './IndiceGruposCampos'

const grupos: GrupoIndiceCampos[] = [
  { slug: 'identificacao', nome: 'Identificação', total: 10 },
  { slug: 'prestador', nome: 'Prestador', total: 7 },
  { slug: 'valores', nome: 'Valores', total: 8 },
]

type RetornoDeChamada = (entradas: IntersectionObserverEntry[]) => void

let dispararRolagem: RetornoDeChamada | null = null

/**
 * jsdom não implementa `IntersectionObserver` — sem este duplo o componente
 * cairia no ramo de guarda e o teste nunca exercitaria o acompanhamento de
 * rolagem, que é justamente o comportamento sob prova.
 */
function instalarObservadorFalso() {
  class ObservadorFalso {
    constructor(retornoDeChamada: RetornoDeChamada) {
      dispararRolagem = retornoDeChamada
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }

  vi.stubGlobal('IntersectionObserver', ObservadorFalso)
}

function entradaVisivel(slug: string, topo: number): IntersectionObserverEntry {
  const alvo = document.getElementById(`grupo-${slug}`)
  return {
    isIntersecting: true,
    target: alvo,
    boundingClientRect: { top: topo },
  } as unknown as IntersectionObserverEntry
}

function renderIndice() {
  return render(
    <div>
      <IndiceGruposCampos grupos={grupos} />
      {grupos.map((grupo) => (
        <div key={grupo.slug} id={`grupo-${grupo.slug}`}>
          {grupo.nome}
        </div>
      ))}
    </div>,
  )
}

afterEach(() => {
  dispararRolagem = null
  vi.unstubAllGlobals()
})

describe('IndiceGruposCampos', () => {
  it('lista os grupos com a contagem de campos dentro de uma navegação nomeada', () => {
    instalarObservadorFalso()
    renderIndice()

    const navegacao = screen.getByRole('navigation', { name: 'Grupos de campo' })
    expect(navegacao).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Prestador/ })).toHaveAttribute(
      'href',
      '#grupo-prestador',
    )
  })

  it('o grupo ativo é marcado com aria-current, nunca só por cor de fundo', () => {
    instalarObservadorFalso()
    renderIndice()

    const primeiro = screen.getByRole('link', { name: /Identificação/ })
    expect(primeiro).toHaveAttribute('aria-current', 'true')
  })

  it('o item ativo acompanha a rolagem e só um item fica marcado por vez', () => {
    instalarObservadorFalso()
    renderIndice()

    act(() => {
      dispararRolagem?.([entradaVisivel('valores', 120), entradaVisivel('prestador', 40)])
    })

    expect(screen.getByRole('link', { name: /Prestador/ })).toHaveAttribute('aria-current', 'true')

    const marcados = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'true')
    expect(marcados).toHaveLength(1)
  })

  it('sem grupos nomeados não renderiza navegação nenhuma', () => {
    instalarObservadorFalso()
    render(<IndiceGruposCampos grupos={[]} />)

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
