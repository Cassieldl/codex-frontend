import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { MudancaDaVersaoLayout } from '../types/layoutPublico'
import { ListaDeMudancas } from './ListaDeMudancas'

function campoNovo(nome: string): MudancaDaVersaoLayout {
  return { tipo: 'campoNovo', antes: null, depois: nome, descricao: null }
}

const SEIS_MUDANCAS: MudancaDaVersaoLayout[] = [
  { tipo: 'saiu', antes: 'ValServEst', depois: null, descricao: null },
  { tipo: 'grupoNovo', antes: null, depois: 'Condominio', descricao: null },
  campoNovo('DestIE'),
  campoNovo('DestIM'),
  campoNovo('nroContCambio'),
  { tipo: 'renomeado', antes: 'nDI', depois: 'nroDUIMP', descricao: null },
]

function caminhosVisiveis(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-mudanca] [data-caminho]')].map(
    (linha) => linha.textContent,
  )
}

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
      />,
    )

    expect(screen.getAllByText('//Prestador/enderPrest/CEP')).toHaveLength(1)
    expect(container).not.toHaveTextContent('passou a ser')
    expect(container).toHaveTextContent('Passou a aceitar CEP estrangeiro.')
  })

  it('caminho longo só pode quebrar depois de uma barra, sem separar o // inicial', () => {
    const caminho = '//Servico/Valores/IBSCBS/ValAjusteBCIBSCBSComExt'
    const { container } = render(<ListaDeMudancas mudancas={[campoNovo(caminho)]} />)

    const linha = container.querySelector('[data-mudanca] [data-caminho]')
    expect(linha).toHaveTextContent(caminho)
    expect(
      [...(linha?.querySelectorAll('wbr') ?? [])].map(
        (quebra) => quebra.previousSibling?.textContent,
      ),
    ).toEqual(['//Servico/', 'Valores/', 'IBSCBS/'])
  })

  it('com limite, mostra os primeiros na ordem da tela e expande e recolhe pelo botão', async () => {
    const usuario = userEvent.setup()
    const { container } = render(<ListaDeMudancas mudancas={SEIS_MUDANCAS} limite={4} />)

    expect(caminhosVisiveis(container)).toEqual(['Condominio', 'DestIE', 'DestIM', 'nroContCambio'])

    const botao = screen.getByRole('button', { name: 'Ver todas as 6 mudanças' })
    expect(botao).toHaveAttribute('aria-expanded', 'false')

    await usuario.click(botao)
    expect(caminhosVisiveis(container)).toHaveLength(6)
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(botao).toHaveAccessibleName('Mostrar menos')

    await usuario.click(botao)
    expect(caminhosVisiveis(container)).toHaveLength(4)
  })

  it('sem limite, ou com menos mudanças que o limite, a lista vem inteira e sem botão', () => {
    const { container, rerender } = render(<ListaDeMudancas mudancas={SEIS_MUDANCAS} />)
    expect(caminhosVisiveis(container)).toHaveLength(6)

    rerender(<ListaDeMudancas mudancas={SEIS_MUDANCAS.slice(0, 4)} limite={4} />)
    expect(caminhosVisiveis(container)).toHaveLength(4)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
