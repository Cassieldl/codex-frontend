import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListaDeMudancas } from './ListaDeMudancas'

describe('ListaDeMudancas', () => {
  it('alterado com o mesmo caminho dos dois lados mostra só o caminho e a descrição', () => {
    const { container } = render(
      <ListaDeMudancas
        mudancas={[
          {
            tipo: 'alterado',
            antes: '//Prestador/enderPrest/CEP',
            depois: '//Prestador/enderPrest/CEP',
            descricao: 'Passou a aceitar CEP estrangeiro.',
          },
        ]}
        ancoraDoCampo={(slug) => `#campo-${slug}`}
      />,
    )

    expect(screen.getAllByText('//Prestador/enderPrest/CEP')).toHaveLength(1)
    expect(container).not.toHaveTextContent('passou a ser')
    expect(container).toHaveTextContent('Passou a aceitar CEP estrangeiro.')
  })
})
