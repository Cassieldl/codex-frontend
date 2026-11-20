import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { OpcaoVersaoProvedorErro, ErroFormProps } from './ErroForm'
import { ErroForm } from './ErroForm'

const opcoesVersoes: OpcaoVersaoProvedorErro[] = [{ id: 1, rotulo: 'Prefeitura de Exemplo · v1' }]

function renderForm(onSubmit = vi.fn<ErroFormProps['onSubmit']>()) {
  render(
    <ErroForm
      opcoesVersoesProvedor={opcoesVersoes}
      opcoesCamposLayout={[]}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />,
  )
  return { onSubmit }
}

async function preencherCamposBase(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText(/código/i), 'E0117')
  await usuario.type(screen.getByLabelText(/título/i), 'CNPJ inválido')
  await usuario.type(screen.getByLabelText('Variante 1'), 'O CNPJ informado não é válido.')
}

describe('ErroForm', () => {
  it('acusa erro em português quando os campos obrigatórios não são preenchidos', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderForm()

    // Origem padrão é Prefeitura - submeter vazio deve acusar código, título
    // e variante, todos em português.
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('O código é obrigatório.')).toBeInTheDocument()
    expect(screen.getByText('O título é obrigatório.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('useFieldArray: adiciona e remove variantes de mensagem', async () => {
    const usuario = userEvent.setup()
    renderForm()

    expect(screen.getByLabelText('Variante 1')).toBeInTheDocument()
    expect(screen.queryByLabelText('Variante 2')).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /adicionar variante/i }))
    expect(screen.getByLabelText('Variante 2')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /remover variante 2/i }))
    expect(screen.queryByLabelText('Variante 2')).not.toBeInTheDocument()
  })

  it('origem="Prefeitura": versoesProvedorIds é obrigatório (mínimo 1)', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderForm()

    await preencherCamposBase(usuario)
    // Origem já é Prefeitura por padrão - não marca nenhuma versão aplicável.
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    expect(
      await screen.findByText(
        'Erros de prefeitura precisam de ao menos um provedor/versão aplicável.',
      ),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await usuario.click(screen.getByLabelText('Prefeitura de Exemplo · v1'))
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      origem: 'Prefeitura',
      versoesProvedorIds: [1],
    })
  })

  it('origem="InvoiCy": versoesProvedorIds é opcional - pode submeter vazio', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderForm()

    await preencherCamposBase(usuario)
    await usuario.click(screen.getByRole('combobox', { name: /origem/i }))
    await usuario.click(screen.getByRole('option', { name: 'InvoiCy' }))

    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ origem: 'InvoiCy', versoesProvedorIds: [] })
    expect(
      screen.queryByText('Erros de prefeitura precisam de ao menos um provedor/versão aplicável.'),
    ).not.toBeInTheDocument()
  })

  it('trocar de Prefeitura para InvoiCy com o campo vazio não deixa erro retroativo', async () => {
    const usuario = userEvent.setup()
    renderForm()

    await preencherCamposBase(usuario)
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))
    expect(
      await screen.findByText(
        'Erros de prefeitura precisam de ao menos um provedor/versão aplicável.',
      ),
    ).toBeInTheDocument()

    await usuario.click(screen.getByRole('combobox', { name: /origem/i }))
    await usuario.click(screen.getByRole('option', { name: 'InvoiCy' }))

    // A mensagem de "obrigatório para Prefeitura" não deve persistir sozinha
    // na tela depois da troca (só reaparece se o usuário submeter de novo, o
    // que aqui não seria mais um erro).
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() =>
      expect(
        screen.queryByText(
          'Erros de prefeitura precisam de ao menos um provedor/versão aplicável.',
        ),
      ).not.toBeInTheDocument(),
    )
  })
})

// Literais, não a constante do schema: o teto é contrato com a coluna `codigo varchar(40)`.
describe('ErroForm: teto do código', () => {
  async function salvarComCodigo(codigo: string) {
    const usuario = userEvent.setup()
    const { onSubmit } = renderForm()

    await usuario.click(screen.getByLabelText(/código/i))
    await usuario.paste(codigo)
    await usuario.type(screen.getByLabelText(/título/i), 'CNPJ inválido')
    await usuario.type(screen.getByLabelText('Variante 1'), 'O CNPJ informado não é válido.')
    await usuario.click(screen.getByLabelText('Prefeitura de Exemplo · v1'))
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    return { onSubmit }
  }

  it('aceita 40 caracteres', async () => {
    const { onSubmit } = await salvarComCodigo('E'.repeat(40))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].codigo).toHaveLength(40)
  })

  it('recusa 41 caracteres sem enviar', async () => {
    const { onSubmit } = await salvarComCodigo('E'.repeat(41))

    expect(await screen.findByText('Máximo de 40 caracteres.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('ErroForm: erro de servidor e fieldset de versões', () => {
  function formulario(props: Partial<ErroFormProps> = {}) {
    return (
      <ErroForm
        opcoesVersoesProvedor={opcoesVersoes}
        opcoesCamposLayout={[]}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        {...props}
      />
    )
  }

  it('o erro de servidor que chega com o formulário rolado vai para a área visível', () => {
    const rolagem = vi.fn<Element['scrollIntoView']>()
    Element.prototype.scrollIntoView = rolagem

    try {
      const { rerender } = render(formulario({ erroServidor: null }))
      rerender(formulario({ erroServidor: 'Outra pessoa salvou este registro.' }))

      expect(rolagem.mock.contexts).toEqual([screen.getByRole('alert')])
    } finally {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
    }
  })

  it('depois de "Tentar novamente" dar certo, o foco vai para a primeira caixa do fieldset', async () => {
    const usuario = userEvent.setup()
    const onRecarregarOpcoesVersoes = vi.fn()
    const { rerender } = render(
      formulario({
        opcoesVersoesProvedor: [],
        statusOpcoesVersoes: 'erro',
        onRecarregarOpcoesVersoes,
      }),
    )

    await usuario.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(onRecarregarOpcoesVersoes).toHaveBeenCalledTimes(1)

    rerender(formulario({ statusOpcoesVersoes: 'pronto', onRecarregarOpcoesVersoes }))

    expect(screen.getByRole('checkbox', { name: 'Prefeitura de Exemplo · v1' })).toHaveFocus()
  })
})
