import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { VizinhoDeCampo } from '../../types/vizinhoDeCampo'
import { BotaoCopiar } from './BotaoCopiar'
import { ModalDeCampoNavegavel, type ModalDeCampoNavegavelProps } from './ModalDeCampoNavegavel'

const VIZINHO_ANTERIOR: VizinhoDeCampo = {
  slug: 'servico-valores-valservicos',
  nome: 'ValServicos',
}
const VIZINHO_SEGUINTE: VizinhoDeCampo = { slug: 'tpsusp', nome: 'tpSusp' }
const LINK_DO_CAMPO = 'https://codex.migrate.info/layout/campos/servico-paipreservico'

function propsBase(
  sobrescritas: Partial<ModalDeCampoNavegavelProps> = {},
): ModalDeCampoNavegavelProps {
  return {
    titulo: 'PaiPreServico',
    chave: 'servico-paipreservico',
    trilha: 'Serviço',
    posicao: 2,
    total: 3,
    filtroAtivo: false,
    anterior: VIZINHO_ANTERIOR,
    proximo: VIZINHO_SEGUINTE,
    onNavegar: vi.fn(),
    onFechar: vi.fn(),
    devolverFoco: vi.fn(),
    linkDoCampo: LINK_DO_CAMPO,
    children: (
      <BotaoCopiar rotulo="Copiar" ariaLabel="Copiar valor do conteúdo" valor="valor-do-conteudo" />
    ),
    ...sobrescritas,
  }
}

/** Propriedades do campo seguinte, como a página as entrega depois de navegar. */
const PROPS_DO_CAMPO_SEGUINTE: Partial<ModalDeCampoNavegavelProps> = {
  titulo: 'tpSusp',
  chave: 'tpsusp',
  posicao: 3,
}

function regiaoDeAnuncio(): HTMLElement {
  return screen
    .getAllByRole('status')
    .find((regiao) => regiao.hasAttribute('data-anuncio-de-navegacao'))!
}

function botaoDoConteudo(): HTMLElement {
  return screen.getByRole('button', { name: 'Copiar valor do conteúdo' })
}

/** Renderiza o modal e troca para o campo seguinte quando ele pede para navegar. */
function renderizarNavegavel() {
  const resultado = render(
    <ModalDeCampoNavegavel
      {...propsBase({
        onNavegar: () =>
          resultado.rerender(<ModalDeCampoNavegavel {...propsBase(PROPS_DO_CAMPO_SEGUINTE)} />),
      })}
    />,
  )

  return resultado
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

describe('ModalDeCampoNavegavel: navegação por teclado', () => {
  it('← e → sem modificador navegam e cancelam o evento', () => {
    const onNavegar = vi.fn()
    render(<ModalDeCampoNavegavel {...propsBase({ onNavegar })} />)
    const dialogo = screen.getByRole('dialog')

    const proximoNaoCancelado = fireEvent.keyDown(dialogo, { key: 'ArrowRight' })
    const anteriorNaoCancelado = fireEvent.keyDown(dialogo, { key: 'ArrowLeft' })

    expect(onNavegar.mock.calls).toEqual([['tpsusp'], ['servico-valores-valservicos']])
    expect(proximoNaoCancelado).toBe(false)
    expect(anteriorNaoCancelado).toBe(false)
  })

  it.each([
    ['Alt', { altKey: true }],
    ['Ctrl', { ctrlKey: true }],
    ['Meta', { metaKey: true }],
    ['Shift', { shiftKey: true }],
  ])('%s+← não navega e deixa o evento para o navegador', (_nome, modificador) => {
    const onNavegar = vi.fn()
    render(<ModalDeCampoNavegavel {...propsBase({ onNavegar })} />)

    const naoCancelado = fireEvent.keyDown(screen.getByRole('dialog'), {
      key: 'ArrowLeft',
      ...modificador,
    })

    expect(onNavegar).not.toHaveBeenCalled()
    expect(naoCancelado).toBe(true)
  })

  it('seta sem vizinho não navega e não cancela o evento', () => {
    const onNavegar = vi.fn()
    render(<ModalDeCampoNavegavel {...propsBase({ anterior: null, proximo: null, onNavegar })} />)
    const dialogo = screen.getByRole('dialog')

    const esquerdaNaoCancelada = fireEvent.keyDown(dialogo, { key: 'ArrowLeft' })
    const direitaNaoCancelada = fireEvent.keyDown(dialogo, { key: 'ArrowRight' })

    expect(onNavegar).not.toHaveBeenCalled()
    expect(esquerdaNaoCancelada).toBe(true)
    expect(direitaNaoCancelada).toBe(true)
  })
})

describe('ModalDeCampoNavegavel: botões de navegação', () => {
  it('Próximo campo e Campo anterior chamam onNavegar com o slug do vizinho', async () => {
    const onNavegar = vi.fn()
    const usuario = userEvent.setup()
    render(<ModalDeCampoNavegavel {...propsBase({ onNavegar })} />)

    await usuario.click(screen.getByRole('button', { name: 'Próximo campo' }))
    await usuario.click(screen.getByRole('button', { name: 'Campo anterior' }))

    expect(onNavegar.mock.calls).toEqual([['tpsusp'], ['servico-valores-valservicos']])
  })

  it('na ponta, o botão fica aria-disabled, não disabled, e o foco continua nele', async () => {
    const onNavegar = vi.fn()
    const usuario = userEvent.setup()
    render(<ModalDeCampoNavegavel {...propsBase({ anterior: null, onNavegar })} />)

    const botao = screen.getByRole('button', { name: 'Campo anterior' })
    await usuario.click(botao)

    expect(botao).toHaveAttribute('aria-disabled', 'true')
    expect(botao).not.toBeDisabled()
    expect(botao).toHaveFocus()
    expect(onNavegar).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Próximo campo' })).not.toHaveAttribute(
      'aria-disabled',
    )
  })

  it('a dica do botão traz o nome do vizinho', () => {
    render(<ModalDeCampoNavegavel {...propsBase()} />)

    expect(screen.getByRole('button', { name: 'Campo anterior' })).toHaveAttribute(
      'title',
      'Campo anterior: ValServicos',
    )
    expect(screen.getByRole('button', { name: 'Próximo campo' })).toHaveAttribute(
      'title',
      'Próximo campo: tpSusp',
    )
  })
})

describe('ModalDeCampoNavegavel: identificação e rodapé', () => {
  it('é um diálogo com o nome do campo, a trilha e o conteúdo após o título', () => {
    render(
      <ModalDeCampoNavegavel {...propsBase({ aposTitulo: <span>Etiqueta de estado</span> })} />,
    )

    const dialogo = screen.getByRole('dialog', { name: 'PaiPreServico' })

    expect(dialogo).toHaveTextContent('Serviço')
    expect(dialogo).toHaveTextContent('Etiqueta de estado')
  })

  it('mostra a posição na sequência e só diz "no filtro atual" com filtro ativo', () => {
    const { rerender } = render(<ModalDeCampoNavegavel {...propsBase()} />)

    expect(screen.getByText('Campo 2 de 3')).toBeInTheDocument()
    expect(screen.queryByText('no filtro atual')).toBeNull()

    rerender(<ModalDeCampoNavegavel {...propsBase({ filtroAtivo: true })} />)

    expect(screen.getByText('no filtro atual')).toBeInTheDocument()
  })

  it('abre com o foco no próprio diálogo', () => {
    render(<ModalDeCampoNavegavel {...propsBase()} />)

    expect(screen.getByRole('dialog')).toHaveFocus()
  })

  it('Esc chama onFechar', async () => {
    const onFechar = vi.fn()
    const usuario = userEvent.setup()
    render(<ModalDeCampoNavegavel {...propsBase({ onFechar })} />)

    await usuario.keyboard('{Escape}')

    expect(onFechar).toHaveBeenCalledTimes(1)
  })

  it('devolve o foco pelo devolverFoco, uma só vez, ao sair', () => {
    const devolverFoco = vi.fn()
    const { unmount } = render(<ModalDeCampoNavegavel {...propsBase({ devolverFoco })} />)

    unmount()

    expect(devolverFoco).toHaveBeenCalledTimes(1)
  })
})

describe('ModalDeCampoNavegavel: copiar link do campo', () => {
  it('copia exatamente o linkDoCampo, com o nome do campo no rótulo acessível', async () => {
    const usuario = userEvent.setup()
    const escreverNaAreaDeTransferencia = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)
    render(<ModalDeCampoNavegavel {...propsBase()} />)

    await usuario.click(screen.getByRole('button', { name: 'Copiar link do campo PaiPreServico' }))

    expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith(
      'https://codex.migrate.info/layout/campos/servico-paipreservico',
    )
  })
})

describe('ModalDeCampoNavegavel: anúncio da troca', () => {
  it('fica vazio na abertura e diz em que campo se está depois de navegar', async () => {
    const usuario = userEvent.setup()
    renderizarNavegavel()

    expect(regiaoDeAnuncio().textContent).toBe('')

    await usuario.click(screen.getByRole('button', { name: 'Próximo campo' }))

    expect(regiaoDeAnuncio().textContent).toBe('Campo 3 de 3: tpSusp')
  })

  it('anuncia também a troca feita pelo teclado', async () => {
    const usuario = userEvent.setup()
    renderizarNavegavel()

    await usuario.keyboard('{ArrowRight}')

    expect(regiaoDeAnuncio().textContent).toBe('Campo 3 de 3: tpSusp')
  })
})

describe('ModalDeCampoNavegavel: troca de chave', () => {
  it('remonta o conteúdo (o "Copiado" zera) sem remontar a região de anúncio', async () => {
    const usuario = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    const { rerender } = render(<ModalDeCampoNavegavel {...propsBase()} />)
    const anuncioAntes = regiaoDeAnuncio()

    await usuario.click(botaoDoConteudo())
    await waitFor(() => expect(botaoDoConteudo()).toHaveTextContent('Copiado'))

    rerender(<ModalDeCampoNavegavel {...propsBase(PROPS_DO_CAMPO_SEGUINTE)} />)

    expect(botaoDoConteudo()).toHaveTextContent(/^Copiar$/)
    expect(regiaoDeAnuncio()).toBe(anuncioAntes)
  })

  it('com a mesma chave o conteúdo é preservado', async () => {
    const usuario = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    const { rerender } = render(<ModalDeCampoNavegavel {...propsBase()} />)

    await usuario.click(botaoDoConteudo())
    await waitFor(() => expect(botaoDoConteudo()).toHaveTextContent('Copiado'))

    rerender(<ModalDeCampoNavegavel {...propsBase({ filtroAtivo: true })} />)

    expect(botaoDoConteudo()).toHaveTextContent('Copiado')
  })
})
