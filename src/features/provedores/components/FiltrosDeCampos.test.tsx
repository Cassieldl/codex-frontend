import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FiltrosDeCampos } from './FiltrosDeCampos'
import type { FiltrosDeCamposProps } from './FiltrosDeCampos'

/** Contagens distintas por chip: uma troca de valores entre chips não passa despercebida. */
const CONTAGENS = { todos: 12, Obrigatorio: 6, Condicional: 2, Opcional: 4 }

function renderizar(sobrescritas: Partial<FiltrosDeCamposProps> = {}) {
  const props: FiltrosDeCamposProps = {
    estado: 'todos',
    termo: '',
    contagens: CONTAGENS,
    filtroAtivo: false,
    buscaRef: createRef<HTMLInputElement>(),
    onEstadoChange: vi.fn(),
    onTermoChange: vi.fn(),
    onLimpar: vi.fn(),
    onExpandirTodos: vi.fn(),
    onRecolherTodos: vi.fn(),
    ...sobrescritas,
  }

  const resultado = render(<FiltrosDeCampos {...props} />)
  return { ...resultado, props }
}

const GRUPO_DE_CHIPS = 'Filtrar por obrigatoriedade'

function chips() {
  return screen
    .getByRole('group', { name: GRUPO_DE_CHIPS })
    .querySelectorAll<HTMLButtonElement>('button')
}

describe('FiltrosDeCampos', () => {
  describe('chips de obrigatoriedade', () => {
    it('mostram a contagem da versão inteira, na ordem Todos, Obrigatórios, Condicionais, Opcionais', () => {
      renderizar()

      expect([...chips()].map((chip) => chip.textContent)).toEqual([
        'Todos 12',
        'Obrigatórios 6',
        'Condicionais 2',
        'Opcionais 4',
      ])
    })

    it('mantêm a contagem quando o termo da busca muda', () => {
      const { rerender, props } = renderizar()

      rerender(<FiltrosDeCampos {...props} termo="cnpj" filtroAtivo />)

      expect([...chips()].map((chip) => chip.textContent)).toEqual([
        'Todos 12',
        'Obrigatórios 6',
        'Condicionais 2',
        'Opcionais 4',
      ])
    })

    it('marcam exatamente um chip como pressionado', () => {
      renderizar({ estado: 'Condicional', filtroAtivo: true })

      const pressionados = [...chips()].filter(
        (chip) => chip.getAttribute('aria-pressed') === 'true',
      )

      expect(pressionados).toHaveLength(1)
      expect(pressionados[0]).toHaveAccessibleName('Condicionais 2')
      expect(
        [...chips()].filter((chip) => chip.getAttribute('aria-pressed') === 'false'),
      ).toHaveLength(3)
    })

    it('mostram um ícone só no chip pressionado, para o estado não depender de cor', () => {
      renderizar({ estado: 'Opcional', filtroAtivo: true })

      const comIcone = [...chips()].filter((chip) => chip.querySelector('svg') !== null)

      expect(comIcone).toHaveLength(1)
      expect(comIcone[0]).toHaveAccessibleName('Opcionais 4')
    })

    it.each([
      ['Todos 12', 'todos'],
      ['Obrigatórios 6', 'Obrigatorio'],
      ['Condicionais 2', 'Condicional'],
      ['Opcionais 4', 'Opcional'],
    ])('clicar em "%s" pede o estado %s', (nome, estadoEsperado) => {
      const { props } = renderizar({ estado: 'Obrigatorio', filtroAtivo: true })

      fireEvent.click(screen.getByRole('button', { name: nome }))

      expect(props.onEstadoChange).toHaveBeenCalledExactlyOnceWith(estadoEsperado)
    })
  })

  describe('busca', () => {
    it('tem como rótulo acessível o texto escondido', () => {
      renderizar()

      expect(
        screen.getByRole('searchbox', {
          name: 'Buscar campo do InvoiCy, tag do provedor ou caminho no XML',
        }),
      ).toBeInTheDocument()
    })

    it('digitar chama onTermoChange com o texto digitado', () => {
      const { props } = renderizar()

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ValorServicos' } })

      expect(props.onTermoChange).toHaveBeenCalledExactlyOnceWith('ValorServicos')
    })

    it('mostra o termo recebido e entrega o input pela ref', () => {
      const buscaRef = createRef<HTMLInputElement>()
      renderizar({ termo: 'cnpj', filtroAtivo: true, buscaRef })

      expect(screen.getByRole('searchbox')).toHaveValue('cnpj')
      expect(buscaRef.current).toBe(screen.getByRole('searchbox'))
    })
  })

  describe('ações', () => {
    it('não oferece "Limpar filtros" sem filtro ativo', () => {
      renderizar({ filtroAtivo: false })

      expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument()
    })

    it('oferece "Limpar filtros" com filtro ativo e chama onLimpar', () => {
      const { props } = renderizar({ filtroAtivo: true, termo: 'cnpj' })

      fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))

      expect(props.onLimpar).toHaveBeenCalledOnce()
    })

    it.each([false, true])('sempre oferece Expandir e Recolher todos (filtroAtivo=%s)', (ativo) => {
      const { props } = renderizar({ filtroAtivo: ativo })

      fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }))
      fireEvent.click(screen.getByRole('button', { name: 'Recolher todos' }))

      expect(props.onExpandirTodos).toHaveBeenCalledOnce()
      expect(props.onRecolherTodos).toHaveBeenCalledOnce()
    })
  })
})
