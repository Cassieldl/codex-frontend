import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

function HospedeiroModal() {
  const [aberto, setAberto] = useState(false)

  return (
    <div>
      <button type="button" onClick={() => setAberto(true)}>
        Abrir modal
      </button>
      <Modal isOpen={aberto} onClose={() => setAberto(false)} title="Título do modal">
        <button type="button">Primeiro</button>
        <button type="button">Segundo</button>
      </Modal>
    </div>
  )
}

describe('Modal', () => {
  it('foca o primeiro campo do conteúdo ao abrir', async () => {
    const usuario = userEvent.setup()
    render(<HospedeiroModal />)

    await usuario.click(screen.getByRole('button', { name: 'Abrir modal' }))

    expect(await screen.findByRole('button', { name: 'Primeiro' })).toHaveFocus()
  })

  it('fecha com Esc', async () => {
    const usuario = userEvent.setup()
    render(<HospedeiroModal />)

    await usuario.click(screen.getByRole('button', { name: 'Abrir modal' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await usuario.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('devolve o foco ao elemento que abriu o modal', async () => {
    const usuario = userEvent.setup()
    render(<HospedeiroModal />)

    const botaoAbrir = screen.getByRole('button', { name: 'Abrir modal' })
    await usuario.click(botaoAbrir)
    await usuario.keyboard('{Escape}')

    expect(botaoAbrir).toHaveFocus()
  })

  it('prende o foco dentro do modal — Tab do último elemento volta ao primeiro', async () => {
    const usuario = userEvent.setup()
    render(<HospedeiroModal />)

    await usuario.click(screen.getByRole('button', { name: 'Abrir modal' }))

    const fechar = screen.getByRole('button', { name: 'Fechar' })
    const segundo = await screen.findByRole('button', { name: 'Segundo' })

    segundo.focus()
    await usuario.tab()

    expect(fechar).toHaveFocus()
  })

  it('prende o foco dentro do modal — Shift+Tab do primeiro elemento vai ao último', async () => {
    const usuario = userEvent.setup()
    render(<HospedeiroModal />)

    await usuario.click(screen.getByRole('button', { name: 'Abrir modal' }))

    const fechar = screen.getByRole('button', { name: 'Fechar' })
    const segundo = await screen.findByRole('button', { name: 'Segundo' })

    fechar.focus()
    await usuario.tab({ shift: true })

    expect(segundo).toHaveFocus()
  })

  it('não renderiza nada quando isOpen é false', () => {
    render(<Modal isOpen={false} onClose={() => {}} title="Oculto" />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('botão "Fechar" tem alvo de toque ampliado (≥44×44) via ::after — Achado #6', async () => {
    const usuario = userEvent.setup()
    render(<HospedeiroModal />)

    await usuario.click(screen.getByRole('button', { name: 'Abrir modal' }))

    const fechar = screen.getByRole('button', { name: 'Fechar' })
    expect(fechar.className).toMatch(/relative/)
    expect(fechar.className).toMatch(/after:h-11/)
    expect(fechar.className).toMatch(/after:w-11/)
  })
})

function HospedeiroComDevolucao({ devolverFoco }: { devolverFoco: () => void }) {
  const [aberto, setAberto] = useState(false)

  return (
    <div>
      <button type="button" onClick={() => setAberto(true)}>
        Abrir modal
      </button>
      <Modal
        isOpen={aberto}
        onClose={() => setAberto(false)}
        title="Título do modal"
        devolverFoco={devolverFoco}
      >
        <button type="button">Primeiro</button>
      </Modal>
    </div>
  )
}

describe('Modal — devolverFoco', () => {
  it('substitui a devolução ao elemento que abriu e roda depois de o diálogo sair do DOM', async () => {
    const usuario = userEvent.setup()
    const dialogoNoDocumentoAoDevolver: boolean[] = []
    const devolverFoco = vi.fn(() => {
      dialogoNoDocumentoAoDevolver.push(screen.queryByRole('dialog') !== null)
    })
    render(<HospedeiroComDevolucao devolverFoco={devolverFoco} />)

    const botaoAbrir = screen.getByRole('button', { name: 'Abrir modal' })
    await usuario.click(botaoAbrir)
    // O espião entra depois do clique: o próprio `user-event` foca o botão ao clicar.
    const focarBotaoAbrir = vi.spyOn(botaoAbrir, 'focus')

    await usuario.keyboard('{Escape}')

    expect(devolverFoco).toHaveBeenCalledTimes(1)
    expect(dialogoNoDocumentoAoDevolver).toEqual([false])
    expect(focarBotaoAbrir).not.toHaveBeenCalled()
  })

  it('chama a versão mais recente da função, não a do primeiro render', () => {
    const primeira = vi.fn()
    const atual = vi.fn()
    const { rerender } = render(
      <Modal isOpen onClose={() => {}} title="Título" devolverFoco={primeira} />,
    )

    rerender(<Modal isOpen onClose={() => {}} title="Título" devolverFoco={atual} />)
    rerender(<Modal isOpen={false} onClose={() => {}} title="Título" devolverFoco={atual} />)

    expect(atual).toHaveBeenCalledTimes(1)
    expect(primeira).not.toHaveBeenCalled()
  })

  it('não é chamada na abertura de um modal montado já aberto, nem sob o StrictMode', () => {
    const devolverFoco = vi.fn()
    const { rerender } = render(
      <StrictMode>
        <Modal isOpen onClose={() => {}} title="Título" devolverFoco={devolverFoco} />
      </StrictMode>,
    )

    expect(devolverFoco).not.toHaveBeenCalled()

    rerender(
      <StrictMode>
        <Modal isOpen={false} onClose={() => {}} title="Título" devolverFoco={devolverFoco} />
      </StrictMode>,
    )

    expect(devolverFoco).toHaveBeenCalledTimes(1)
  })
})

describe('Modal — focoInicial', () => {
  it('"dialogo" foca o próprio diálogo, e não o primeiro botão do conteúdo', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Título" focoInicial="dialogo">
        <button type="button">Primeiro</button>
      </Modal>,
    )

    expect(screen.getByRole('dialog')).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Primeiro' })).not.toHaveFocus()
  })

  it('"conteudo" mantém o comportamento atual: foca o primeiro focável do conteúdo', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Título" focoInicial="conteudo">
        <button type="button">Primeiro</button>
      </Modal>,
    )

    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus()
  })

  it('Shift+Tab a partir do nó do diálogo vai ao último focável, sem escapar para a página', async () => {
    const usuario = userEvent.setup()
    render(
      <div>
        <button type="button">Botão da página</button>
        <Modal isOpen onClose={() => {}} title="Título" focoInicial="dialogo">
          <button type="button">Primeiro</button>
          <button type="button">Segundo</button>
        </Modal>
      </div>,
    )
    expect(screen.getByRole('dialog')).toHaveFocus()

    await usuario.tab({ shift: true })

    expect(screen.getByRole('button', { name: 'Segundo' })).toHaveFocus()
  })
})

describe('Modal — variante painel', () => {
  function renderizarPainel(onClose: () => void = () => {}) {
    return render(
      <Modal
        isOpen
        onClose={onClose}
        title="Campo ValorServicos"
        variante="painel"
        sobretitulo={<p>Serviço › Valores</p>}
        aposTitulo={<span>Etiqueta de estado</span>}
        acoesDoCabecalho={<button type="button">Ação do cabeçalho</button>}
        rodape={<p>Campo 1 de 3</p>}
      >
        <button type="button">Dentro do conteúdo</button>
      </Modal>,
    )
  }

  it('renderiza sobretítulo, título, após-título e rodapé', () => {
    renderizarPainel()

    expect(screen.getByText('Serviço › Valores')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Campo ValorServicos' })).toBeInTheDocument()
    expect(screen.getByText('Etiqueta de estado')).toBeInTheDocument()
    expect(screen.getByText('Campo 1 de 3')).toBeInTheDocument()
  })

  it('o próprio diálogo é a região rolável, com cabeçalho e rodapé fixos dentro dele', () => {
    renderizarPainel()

    const dialogo = screen.getByRole('dialog')
    const cabecalho = screen
      .getByRole('heading', { name: 'Campo ValorServicos' })
      .closest('.sticky')
    const rodape = screen.getByText('Campo 1 de 3').parentElement

    expect(dialogo.className).toContain('overflow-y-auto')
    expect(cabecalho?.className).toContain('top-0')
    expect(rodape?.className).toContain('sticky')
    expect(rodape?.className).toContain('bottom-0')
    expect(dialogo.contains(cabecalho)).toBe(true)
    expect(dialogo.contains(rodape)).toBe(true)
  })

  it('a variante padrão rola dentro da altura da tela e não tem desfoque no fundo', async () => {
    const usuario = userEvent.setup()
    render(<HospedeiroModal />)
    await usuario.click(screen.getByRole('button', { name: 'Abrir modal' }))

    const dialogo = screen.getByRole('dialog')

    expect(dialogo.className).toContain('overflow-y-auto')
    expect(dialogo.className).toContain('overscroll-contain')
    expect(dialogo.className).toMatch(/max-h-\[calc\(100dvh-/)
    expect(dialogo.parentElement?.className).not.toContain('backdrop-blur')
  })

  it('o fundo desfocado é estático: sem transição no desfoque', () => {
    renderizarPainel()

    const fundo = screen.getByRole('dialog').parentElement

    expect(fundo?.className).toContain('backdrop-blur-[3px]')
    expect(fundo?.className).not.toMatch(/transition/)
  })

  it('as ações do cabeçalho entram na armadilha de Tab', async () => {
    const usuario = userEvent.setup()
    renderizarPainel()
    const acao = screen.getByRole('button', { name: 'Ação do cabeçalho' })
    const interno = screen.getByRole('button', { name: 'Dentro do conteúdo' })
    expect(interno).toHaveFocus()

    await usuario.tab()
    expect(acao).toHaveFocus()

    await usuario.tab({ shift: true })
    expect(interno).toHaveFocus()
  })

  it('fecha com Esc e ao clicar no fundo, mas não ao clicar dentro do diálogo', async () => {
    const usuario = userEvent.setup()
    const onClose = vi.fn()
    renderizarPainel(onClose)

    await usuario.click(screen.getByText('Campo 1 de 3'))
    expect(onClose).not.toHaveBeenCalled()

    await usuario.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)

    await usuario.click(screen.getByRole('dialog').parentElement!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('o botão "Fechar" mantém o alvo de toque ampliado (≥44×44)', () => {
    renderizarPainel()

    const fechar = screen.getByRole('button', { name: 'Fechar' })

    expect(fechar.className).toMatch(/after:h-11/)
    expect(fechar.className).toMatch(/after:w-11/)
  })

  it('título só para leitor de tela mantém o nome do diálogo', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Nome oculto" variante="painel" titleVisuallyHidden />,
    )

    expect(screen.getByRole('heading', { name: 'Nome oculto' }).className).toContain('sr-only')
    expect(screen.getByRole('dialog', { name: 'Nome oculto' })).toBeInTheDocument()
  })
})

describe('Modal — variante padrão', () => {
  it('não aceita as props do painel e não renderiza nada de painel', () => {
    render(
      // @ts-expect-error `rodape` só existe na variante `painel`
      <Modal isOpen onClose={() => {}} title="Padrão" rodape={<p>Rodapé do painel</p>} />,
    )

    expect(screen.queryByText('Rodapé do painel')).not.toBeInTheDocument()
  })
})

describe('Modal — chaveDoConteudo', () => {
  function modalPainelComChave(chave: string, aberto = true) {
    return (
      <Modal
        isOpen={aberto}
        onClose={() => {}}
        title="Campo"
        variante="painel"
        chaveDoConteudo={chave}
        acoesDoCabecalho={<button type="button">Próximo campo</button>}
      >
        <button type="button">Copiar caminho</button>
      </Modal>
    )
  }

  function simularRolagem(elemento: HTMLElement, inicial: number): { lerScrollTop: () => number } {
    let scrollTop = inicial
    Object.defineProperty(elemento, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: (valor: number) => {
        scrollTop = valor
      },
    })

    return { lerScrollTop: () => scrollTop }
  }

  it('ao mudar, a rolagem volta ao topo', () => {
    const { rerender } = render(modalPainelComChave('campo-1'))
    const rolagem = simularRolagem(screen.getByRole('dialog'), 240)

    rerender(modalPainelComChave('campo-2'))

    expect(rolagem.lerScrollTop()).toBe(0)
  })

  it('com a mesma chave, a rolagem não é tocada (nem depois de uma troca anterior)', () => {
    const { rerender } = render(modalPainelComChave('campo-1'))
    rerender(modalPainelComChave('campo-2'))
    const rolagem = simularRolagem(screen.getByRole('dialog'), 240)

    rerender(modalPainelComChave('campo-2'))

    expect(rolagem.lerScrollTop()).toBe(240)
  })

  it('reabrir com a chave que já foi aplicada não reposiciona a rolagem', () => {
    const { rerender } = render(modalPainelComChave('campo-1'))
    rerender(modalPainelComChave('campo-2'))
    rerender(modalPainelComChave('campo-2', false))
    const reposicionar = vi.spyOn(Element.prototype, 'scrollTop', 'set')

    rerender(modalPainelComChave('campo-2'))

    expect(reposicionar).not.toHaveBeenCalled()
    reposicionar.mockRestore()
  })

  it('com o foco no <body> (conteúdo anterior desmontado), o foco vai ao diálogo', () => {
    const { rerender } = render(modalPainelComChave('campo-1'))
    const dialogo = screen.getByRole('dialog')
    const focarDialogo = vi.spyOn(dialogo, 'focus')
    ;(document.activeElement as HTMLElement).blur()
    expect(document.body).toHaveFocus()

    rerender(modalPainelComChave('campo-2'))

    expect(focarDialogo).toHaveBeenCalledWith({ preventScroll: true })
    expect(dialogo).toHaveFocus()
  })

  it('com o foco num botão do cabeçalho, o foco fica nele', () => {
    const { rerender } = render(modalPainelComChave('campo-1'))
    const proximo = screen.getByRole('button', { name: 'Próximo campo' })
    proximo.focus()

    rerender(modalPainelComChave('campo-2'))

    expect(proximo).toHaveFocus()
  })
})
