import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ItemDoMenuDeAcoes, MenuDeAcoes } from './MenuDeAcoes'

function renderizarMenu(aoRemover = vi.fn(), aoDespublicar = vi.fn()) {
  render(
    <MenuDeAcoes rotulo="Mais ações do erro E0117">
      <ItemDoMenuDeAcoes onSelecionar={aoDespublicar}>Despublicar</ItemDoMenuDeAcoes>
      <ItemDoMenuDeAcoes destrutivo aria-label="Remover erro E0117" onSelecionar={aoRemover}>
        Remover
      </ItemDoMenuDeAcoes>
    </MenuDeAcoes>,
  )
  return screen.getByRole('button', { name: 'Mais ações do erro E0117' })
}

describe('MenuDeAcoes', () => {
  it('abre pelo teclado no primeiro item, as setas dão a volta e o Esc devolve o foco ao botão', async () => {
    const usuario = userEvent.setup()
    const botao = renderizarMenu()

    botao.focus()
    await usuario.keyboard('{Enter}')

    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'Despublicar' })).toHaveFocus()

    await usuario.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Remover erro E0117' })).toHaveFocus()
    await usuario.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Despublicar' })).toHaveFocus()
    await usuario.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'Remover erro E0117' })).toHaveFocus()

    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(botao).toHaveFocus()
  })

  it('escolher um item fecha o menu, devolve o foco e só então executa a ação', async () => {
    const usuario = userEvent.setup()
    const focoNaHoraDaAcao: Element[] = []
    const aoRemover = vi.fn(() => {
      if (document.activeElement) focoNaHoraDaAcao.push(document.activeElement)
    })
    const botao = renderizarMenu(aoRemover)

    await usuario.click(botao)
    await usuario.click(screen.getByRole('menuitem', { name: 'Remover erro E0117' }))

    expect(aoRemover).toHaveBeenCalledTimes(1)
    // Um diálogo aberto pela ação captura este foco e o devolve ao botão quando fecha.
    expect(focoNaHoraDaAcao).toEqual([botao])
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('item indisponível mostra o motivo e não executa a ação', async () => {
    const usuario = userEvent.setup()
    const aoRemover = vi.fn()
    render(
      <MenuDeAcoes rotulo="Mais ações do artigo Como funciona">
        <ItemDoMenuDeAcoes
          aria-label="Remover artigo Como funciona"
          motivoIndisponivel="Artigo obrigatório: não pode ser removido"
          onSelecionar={aoRemover}
        >
          Remover
        </ItemDoMenuDeAcoes>
      </MenuDeAcoes>,
    )

    await usuario.click(screen.getByRole('button', { name: 'Mais ações do artigo Como funciona' }))
    const item = screen.getByRole('menuitem', { name: 'Remover artigo Como funciona' })
    await usuario.click(item)

    expect(item).toHaveAttribute('aria-disabled', 'true')
    expect(item).toHaveAccessibleDescription('Artigo obrigatório: não pode ser removido')
    expect(aoRemover).not.toHaveBeenCalled()
  })
})

describe('MenuDeAcoes ocupado', () => {
  it('fica focável e anuncia a espera, mas não abre: botão disabled perderia o foco', async () => {
    const usuario = userEvent.setup()
    render(
      <MenuDeAcoes rotulo="Mais ações do erro E0117" isLoading>
        <ItemDoMenuDeAcoes onSelecionar={vi.fn()}>Despublicar</ItemDoMenuDeAcoes>
      </MenuDeAcoes>,
    )
    const botao = screen.getByRole('button', { name: 'Mais ações do erro E0117' })

    expect(botao).toBeEnabled()
    expect(botao).toHaveAttribute('aria-busy', 'true')
    expect(botao).toHaveAttribute('aria-disabled', 'true')

    await usuario.click(botao)
    botao.focus()
    await usuario.keyboard('{ArrowDown}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(botao).toHaveFocus()
  })
})
