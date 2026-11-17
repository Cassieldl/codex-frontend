import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CONTRASTE_MINIMO, calcularContraste } from '../../utils/contraste'
import { Select, type SelectOption } from './Select'

const OPCOES: SelectOption[] = [
  { value: 'nacional', label: 'Nacional' },
  { value: 'regional', label: 'Regional' },
  { value: 'proprio', label: 'Próprio' },
]

function renderizarSelect(props: Partial<ComponentProps<typeof Select>> = {}) {
  const onValueChange = vi.fn<(valor: string) => void>()
  const utilitarios = render(
    <Select
      label="Categoria"
      options={OPCOES}
      value={null}
      onValueChange={onValueChange}
      {...props}
    />,
  )

  return { ...utilitarios, onValueChange }
}

/**
 * Resolve o `aria-activedescendant` do jeito que um leitor de tela resolve:
 * segue o IDREF até o elemento real. Falha alto se o atributo estiver ausente
 * ou pendurado num id inexistente — que é justamente o defeito do P-13.
 */
function opcaoAnunciadaComoAtiva(combobox: HTMLElement): HTMLElement {
  const idAtivo = combobox.getAttribute('aria-activedescendant')
  if (idAtivo === null) {
    throw new Error('combobox sem aria-activedescendant: nada é anunciado ao navegar')
  }

  const opcao = document.getElementById(idAtivo)
  if (opcao === null) {
    throw new Error(`aria-activedescendant aponta para id inexistente: "${idAtivo}"`)
  }

  return opcao
}

describe('Select — rótulo e identificação', () => {
  it('associa o <label> ao combobox via htmlFor/id', () => {
    renderizarSelect()

    expect(screen.getByLabelText('Categoria')).toBe(screen.getByRole('combobox'))
  })

  it('usa o id explícito quando fornecido', () => {
    renderizarSelect({ id: 'categoria-do-provedor' })

    expect(screen.getByRole('combobox')).toHaveAttribute('id', 'categoria-do-provedor')
  })

  it('gera ids diferentes quando dois selects não recebem id explícito (AP-FRONTEND-003)', () => {
    render(
      <>
        <Select label="Categoria" options={OPCOES} value={null} onValueChange={vi.fn()} />
        <Select label="Situação" options={OPCOES} value={null} onValueChange={vi.fn()} />
      </>,
    )

    const [primeiro, segundo] = screen.getAllByRole('combobox')
    expect(primeiro.id).not.toBe('')
    expect(segundo.id).not.toBe('')
    expect(primeiro.id).not.toBe(segundo.id)
  })
})

// Achado #7 do QA (rodada 1): o asterisco visual é `aria-hidden`, então sem o
// par `sr-only` + `aria-required` o campo não é anunciado como obrigatório a
// leitor de tela. O achado foi fechado sem teste — esta é a dívida P-07.
describe('Select — estado obrigatório (Achado #7 do QA)', () => {
  it('anuncia "obrigatório" a leitor de tela e marca aria-required no combobox', () => {
    renderizarSelect({ required: true })

    const combobox = screen.getByRole('combobox')
    expect(combobox).toHaveAttribute('aria-required', 'true')
    expect(screen.getByText('(obrigatório)')).toHaveClass('sr-only')
    // Asserção que fecha o achado de fato: o texto `sr-only` entra no NOME
    // ACESSÍVEL calculado do combobox (o `<label>` vence o conteúdo do botão),
    // então o leitor de tela anuncia campo + estado. Ver classe CSS sozinha não
    // provaria isso.
    expect(combobox).toHaveAccessibleName(/^Categoria.*obrigatório/)
  })

  it('esconde o asterisco visual do leitor de tela (não é o portador da informação)', () => {
    renderizarSelect({ required: true })

    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true')
  })

  it('sem required, não há asterisco nem texto "(obrigatório)"', () => {
    renderizarSelect()

    expect(screen.queryByText('*')).not.toBeInTheDocument()
    expect(screen.queryByText('(obrigatório)')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-required', 'false')
    expect(screen.getByRole('combobox')).toHaveAccessibleName('Categoria')
  })
})

describe('Select — hint e erro', () => {
  it('erro é comunicado por texto + aria-invalid + aria-describedby, nunca só cor', () => {
    renderizarSelect({ error: 'A categoria é obrigatória.' })

    const combobox = screen.getByRole('combobox')
    expect(combobox).toHaveAttribute('aria-invalid', 'true')

    const descritoPor = combobox.getAttribute('aria-describedby')
    expect(descritoPor).toBeTruthy()
    expect(screen.getByText('A categoria é obrigatória.').id).toBe(descritoPor)
  })

  it('mostra o hint e o aponta por aria-describedby quando não há erro', () => {
    renderizarSelect({ hint: 'Usada para agrupar provedores.' })

    const combobox = screen.getByRole('combobox')
    expect(screen.getByText('Usada para agrupar provedores.').id).toBe(
      combobox.getAttribute('aria-describedby'),
    )
  })

  it('com erro, o hint deixa de ser renderizado (uma mensagem por vez)', () => {
    renderizarSelect({ hint: 'Usada para agrupar provedores.', error: 'Campo obrigatório.' })

    expect(screen.queryByText('Usada para agrupar provedores.')).not.toBeInTheDocument()
    expect(screen.getByText('Campo obrigatório.')).toBeInTheDocument()
  })

  it('sem erro, aria-invalid é false e não há aria-describedby', () => {
    renderizarSelect()

    const combobox = screen.getByRole('combobox')
    expect(combobox).toHaveAttribute('aria-invalid', 'false')
    expect(combobox).not.toHaveAttribute('aria-describedby')
  })
})

describe('Select — valor exibido', () => {
  it('mostra o placeholder enquanto nada está selecionado', () => {
    renderizarSelect({ placeholder: 'Selecione a categoria…' })

    expect(screen.getByRole('combobox')).toHaveTextContent('Selecione a categoria…')
  })

  it('mostra o label da opção correspondente ao value', () => {
    renderizarSelect({ value: 'regional' })

    expect(screen.getByRole('combobox')).toHaveTextContent('Regional')
  })

  it('cai no placeholder quando o value não existe nas options', () => {
    renderizarSelect({ value: 'inexistente', placeholder: 'Selecione…' })

    expect(screen.getByRole('combobox')).toHaveTextContent('Selecione…')
  })
})

describe('Select — abrir, selecionar e fechar com mouse', () => {
  it('começa fechado, com aria-expanded=false e sem listbox no DOM', () => {
    renderizarSelect()

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('abre no clique, com listbox rotulado e aria-controls apontando para ele', async () => {
    const usuario = userEvent.setup()
    renderizarSelect()

    const combobox = screen.getByRole('combobox')
    await usuario.click(combobox)

    const listbox = screen.getByRole('listbox')
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
    expect(combobox.getAttribute('aria-controls')).toBe(listbox.id)
    expect(listbox).toHaveAccessibleName('Categoria')
    expect(screen.getAllByRole('option')).toHaveLength(OPCOES.length)
  })

  it('marca aria-selected apenas na opção correspondente ao value', async () => {
    const usuario = userEvent.setup()
    renderizarSelect({ value: 'regional' })

    await usuario.click(screen.getByRole('combobox'))

    expect(screen.getByRole('option', { name: 'Regional' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('option', { name: 'Nacional' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('clicar numa opção emite onValueChange, fecha a lista e devolve o foco ao combobox', async () => {
    const usuario = userEvent.setup()
    const { onValueChange } = renderizarSelect()

    await usuario.click(screen.getByRole('combobox'))
    await usuario.click(screen.getByRole('option', { name: 'Próprio' }))

    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith('proprio')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveFocus()
  })

  it('segundo clique no combobox fecha a lista', async () => {
    const usuario = userEvent.setup()
    renderizarSelect()

    const combobox = screen.getByRole('combobox')
    await usuario.click(combobox)
    await usuario.click(combobox)

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('Select — teclado', () => {
  it('ArrowDown abre a lista sem selecionar nada', async () => {
    const usuario = userEvent.setup()
    const { onValueChange } = renderizarSelect()

    screen.getByRole('combobox').focus()
    await usuario.keyboard('{ArrowDown}')

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('ArrowDown + Enter seleciona a opção seguinte à atual', async () => {
    const usuario = userEvent.setup()
    const { onValueChange } = renderizarSelect({ value: 'nacional' })

    screen.getByRole('combobox').focus()
    await usuario.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith('regional')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('ArrowUp circula do primeiro item para o último', async () => {
    const usuario = userEvent.setup()
    const { onValueChange } = renderizarSelect({ value: 'nacional' })

    screen.getByRole('combobox').focus()
    await usuario.keyboard('{ArrowDown}{ArrowUp}{Enter}')

    expect(onValueChange).toHaveBeenCalledWith('proprio')
  })

  it('Escape fecha a lista sem selecionar', async () => {
    const usuario = userEvent.setup()
    const { onValueChange } = renderizarSelect()

    screen.getByRole('combobox').focus()
    await usuario.keyboard('{ArrowDown}')
    await usuario.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('Tab fecha a lista e sai do campo', async () => {
    const usuario = userEvent.setup()
    renderizarSelect()

    screen.getByRole('combobox').focus()
    await usuario.keyboard('{ArrowDown}')
    await usuario.tab()

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).not.toHaveFocus()
  })

  it('blur fecha a lista (clicar fora não deixa o menu aberto)', async () => {
    const usuario = userEvent.setup()
    render(
      <>
        <Select label="Categoria" options={OPCOES} value={null} onValueChange={vi.fn()} />
        <button type="button">Fora</button>
      </>,
    )

    await usuario.click(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Fora' }))

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('Select — desabilitado', () => {
  it('não abre a lista por clique nem por teclado quando disabled', async () => {
    const usuario = userEvent.setup()
    const { onValueChange } = renderizarSelect({ disabled: true })

    const combobox = screen.getByRole('combobox')
    expect(combobox).toBeDisabled()

    await usuario.click(combobox)
    combobox.focus()
    await usuario.keyboard('{ArrowDown}{Enter}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onValueChange).not.toHaveBeenCalled()
  })
})

// P-13: o destaque da opção ativa era só visual (`bg-surface-hover`). Quem
// navega de teclado via o destaque e não OUVIA nada até apertar Enter. As
// asserções abaixo checam o que chega ao leitor de tela — o elemento apontado
// pelo `aria-activedescendant` e seu nome acessível —, nunca a classe CSS.
describe('Select — opção ativa anunciada (P-13, padrão APG)', () => {
  it('ao abrir, anuncia como ativa a opção já selecionada', async () => {
    const usuario = userEvent.setup()
    renderizarSelect({ value: 'regional' })

    const combobox = screen.getByRole('combobox')
    await usuario.click(combobox)

    const anunciada = opcaoAnunciadaComoAtiva(combobox)
    expect(anunciada).toHaveAccessibleName('Regional')
    expect(anunciada).toBe(screen.getByRole('option', { name: 'Regional' }))
  })

  it('ao abrir sem nada selecionado, anuncia a primeira opção', async () => {
    const usuario = userEvent.setup()
    renderizarSelect()

    const combobox = screen.getByRole('combobox')
    await usuario.click(combobox)

    expect(opcaoAnunciadaComoAtiva(combobox)).toHaveAccessibleName('Nacional')
  })

  it('ArrowDown move o anúncio para a opção seguinte SEM precisar de Enter', async () => {
    const usuario = userEvent.setup()
    const { onValueChange } = renderizarSelect({ value: 'nacional' })

    const combobox = screen.getByRole('combobox')
    combobox.focus()
    await usuario.keyboard('{ArrowDown}')
    expect(opcaoAnunciadaComoAtiva(combobox)).toHaveAccessibleName('Nacional')

    await usuario.keyboard('{ArrowDown}')

    expect(opcaoAnunciadaComoAtiva(combobox)).toHaveAccessibleName('Regional')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('ArrowUp circula o anúncio do primeiro item para o último', async () => {
    const usuario = userEvent.setup()
    renderizarSelect({ value: 'nacional' })

    const combobox = screen.getByRole('combobox')
    combobox.focus()
    await usuario.keyboard('{ArrowDown}{ArrowUp}')

    expect(opcaoAnunciadaComoAtiva(combobox)).toHaveAccessibleName('Próprio')
  })

  it('Home e End levam o anúncio à primeira e à última opção', async () => {
    const usuario = userEvent.setup()
    renderizarSelect({ value: 'regional' })

    const combobox = screen.getByRole('combobox')
    combobox.focus()
    await usuario.keyboard('{ArrowDown}{End}')
    expect(opcaoAnunciadaComoAtiva(combobox)).toHaveAccessibleName('Próprio')

    await usuario.keyboard('{Home}')
    expect(opcaoAnunciadaComoAtiva(combobox)).toHaveAccessibleName('Nacional')
  })

  it('o mouse sobre uma opção também move o anúncio (teclado e mouse não divergem)', async () => {
    const usuario = userEvent.setup()
    renderizarSelect()

    const combobox = screen.getByRole('combobox')
    await usuario.click(combobox)
    await usuario.hover(screen.getByRole('option', { name: 'Próprio' }))

    expect(opcaoAnunciadaComoAtiva(combobox)).toHaveAccessibleName('Próprio')
  })

  it('cada opção tem um id próprio (anúncio não fica preso na primeira)', async () => {
    const usuario = userEvent.setup()
    renderizarSelect()

    await usuario.click(screen.getByRole('combobox'))

    const ids = screen.getAllByRole('option').map((opcao) => opcao.id)
    expect(ids).toHaveLength(OPCOES.length)
    expect(ids.every((idDaOpcao) => idDaOpcao !== '')).toBe(true)
    expect(new Set(ids).size).toBe(OPCOES.length)
  })

  it('fechado, o atributo fica AUSENTE — não vazio nem apontando para o nada', () => {
    renderizarSelect({ value: 'regional' })

    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-activedescendant')
  })

  it('após selecionar, o anúncio de opção ativa é retirado junto com a lista', async () => {
    const usuario = userEvent.setup()
    renderizarSelect()

    const combobox = screen.getByRole('combobox')
    await usuario.click(combobox)
    await usuario.click(screen.getByRole('option', { name: 'Próprio' }))

    expect(combobox).not.toHaveAttribute('aria-activedescendant')
  })

  it('lista aberta sem opções não deixa IDREF pendurado', async () => {
    const usuario = userEvent.setup()
    renderizarSelect({ options: [] })

    const combobox = screen.getByRole('combobox')
    await usuario.click(combobox)

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(combobox).not.toHaveAttribute('aria-activedescendant')
  })
})

// P-14: `aria-controls` apontava para o `<ul>` mesmo fechado, quando o elemento
// nem existe no DOM. Mesmo princípio do P-13: IDREF só enquanto há alvo.
describe('Select — aria-controls acompanha a existência da lista (P-14)', () => {
  it('fechado, não há aria-controls apontando para elemento inexistente', () => {
    renderizarSelect()

    const combobox = screen.getByRole('combobox')
    expect(combobox).not.toHaveAttribute('aria-controls')
    expect(document.getElementById(`${combobox.id}-listbox`)).toBeNull()
  })

  it('volta a não ter aria-controls depois que a lista fecha', async () => {
    const usuario = userEvent.setup()
    renderizarSelect()

    const combobox = screen.getByRole('combobox')
    await usuario.click(combobox)
    expect(combobox.getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id)

    await usuario.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(combobox).not.toHaveAttribute('aria-controls')
  })
})

/**
 * O rótulo do campo é desenhado sobre a superfície onde o `Select` está, não sobre o controle.
 * Fixá-lo em `text-ink` fez o filtro de provedor da busca ficar em 1,1:1 contra o gradiente do
 * cabeçalho — invisível na tela mais usada do produto, e fora do alcance da auditoria de tokens,
 * que mede cores isoladas e não a composição.
 *
 * O caso afirma LEGIBILIDADE, não nome de classe: resolve a classe aplicada para a cor real do
 * token e mede o contraste contra as duas pontas do gradiente.
 */
describe('legibilidade do rótulo por superfície', () => {
  const COR_DA_CLASSE: Record<string, string> = {
    'text-ink': '#1b2633',
    'text-white': '#ffffff',
  }

  /** As duas pontas de `--grad-escuro`; a mais escura é a que reprova primeiro. */
  const PONTAS_DO_GRADIENTE_ESCURO = ['#074b7f', '#002f4f']
  const SUPERFICIE_CLARA = '#ffffff'

  function corDoRotulo(rotulo: HTMLElement): string {
    const classe = [...rotulo.classList].find((nome) => nome in COR_DA_CLASSE)

    expect(classe, 'o rótulo precisa declarar uma cor de texto conhecida').toBeDefined()
    return COR_DA_CLASSE[classe as string]
  }

  it('mantém o rótulo acima de AA sobre o gradiente escuro do cabeçalho', () => {
    renderizarSelect({ superficie: 'escura' })

    const cor = corDoRotulo(screen.getByText('Categoria'))

    for (const fundo of PONTAS_DO_GRADIENTE_ESCURO) {
      expect(calcularContraste(cor, fundo)).toBeGreaterThanOrEqual(CONTRASTE_MINIMO.textoNormal)
    }
  })

  it('mantém o rótulo acima de AA sobre superfície clara', () => {
    renderizarSelect()

    const cor = corDoRotulo(screen.getByText('Categoria'))

    expect(calcularContraste(cor, SUPERFICIE_CLARA)).toBeGreaterThanOrEqual(
      CONTRASTE_MINIMO.textoNormal,
    )
  })

  /**
   * O controle é um campo de formulário: ele carrega o próprio fundo, senão o texto escuro fica
   * sobre a superfície de trás, qualquer que seja ela.
   */
  it('desenha o controle com fundo próprio para não depender da superfície', () => {
    renderizarSelect({ superficie: 'escura' })

    expect(screen.getByRole('combobox')).toHaveClass('bg-white')
  })
})
