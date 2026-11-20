import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ExemploAdmin } from '../types/exemploAdmin'
import type { ExemploFormProps } from './ExemploForm'
import { ExemploForm } from './ExemploForm'

/**
 * Literal de propósito: é contrato com `TetosExemplo.XmlCaracteres` do backend. Importar a
 * constante da unidade sob teste provaria só que existe um teto - subir o valor nos dois lados
 * manteria a suíte verde e o cliente reprovaria conteúdo que o servidor aceita.
 */
const TETO_XML_CARACTERES = 65536

/** Idem: o cap de descrição casa com `TetosExemplo.DescricaoCaracteres`. */
const TETO_DESCRICAO_CARACTERES = 500

/** XML com `total` CARACTERES, todos acentuados no miolo - 2 bytes cada em UTF-8. */
function xmlAcentuadoCom(total: number): string {
  const abertura = '<nfse>'
  const fechamento = '</nfse>'
  return abertura + 'ç'.repeat(total - abertura.length - fechamento.length) + fechamento
}

function preencherCampo(nome: RegExp, valor: string) {
  fireEvent.change(screen.getByRole('textbox', { name: nome }), { target: { value: valor } })
}

const exemploExistente: ExemploAdmin = {
  id: 1,
  versaoProvedorId: 10,
  slug: 'nota-simples',
  nome: 'Nota simples',
  descricao: 'Serviço único, sem retenção.',
  xml: '<nfse />',
  versaoConcorrencia: 7,
  etag: 'W/"7"',
}

describe('ExemploForm: teto do XML (C3)', () => {
  it('aceita XML acentuado de exatamente 65536 CARACTERES, ainda que passe de 65536 bytes', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn<ExemploFormProps['onSubmit']>()
    const xmlNoLimite = xmlAcentuadoCom(TETO_XML_CARACTERES)

    // A régua é a mesma do backend (`xml.Length` de uma string .NET, UTF-16).
    // Este XML tem o dobro disso em bytes: medir bytes aqui reprovaria no
    // cliente um conteúdo que o servidor aceita.
    expect(xmlNoLimite).toHaveLength(TETO_XML_CARACTERES)
    expect(new TextEncoder().encode(xmlNoLimite).length).toBeGreaterThan(TETO_XML_CARACTERES)

    render(<ExemploForm onSubmit={onSubmit} onCancel={() => {}} />)

    preencherCampo(/Nome do cenário/, 'Nota longa')
    preencherCampo(/XML/, xmlNoLimite)
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].xml).toHaveLength(TETO_XML_CARACTERES)
  })

  it('reprova XML com um caractere a mais que o teto, com mensagem em português', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn<ExemploFormProps['onSubmit']>()

    render(<ExemploForm onSubmit={onSubmit} onCancel={() => {}} />)

    preencherCampo(/Nome do cenário/, 'Nota longa demais')
    preencherCampo(/XML/, xmlAcentuadoCom(TETO_XML_CARACTERES + 1))
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByText(`O XML deve ter no máximo ${TETO_XML_CARACTERES} caracteres.`),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('ExemploForm: teto do resumo', () => {
  it('aceita resumo de exatamente 500 caracteres', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn<ExemploFormProps['onSubmit']>()

    render(<ExemploForm onSubmit={onSubmit} onCancel={() => {}} />)

    preencherCampo(/Nome do cenário/, 'Nota com resumo')
    preencherCampo(/Resumo/, 'r'.repeat(TETO_DESCRICAO_CARACTERES))
    preencherCampo(/XML/, '<nfse />')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('reprova resumo com um caractere a mais que o teto', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn<ExemploFormProps['onSubmit']>()

    render(<ExemploForm onSubmit={onSubmit} onCancel={() => {}} />)

    preencherCampo(/Nome do cenário/, 'Nota com resumo longo')
    preencherCampo(/Resumo/, 'r'.repeat(TETO_DESCRICAO_CARACTERES + 1))
    preencherCampo(/XML/, '<nfse />')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByText(`Máximo de ${TETO_DESCRICAO_CARACTERES} caracteres.`),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('ExemploForm: demais regras', () => {
  it('exige nome e XML antes de chamar o servidor', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn<ExemploFormProps['onSubmit']>()

    render(<ExemploForm onSubmit={onSubmit} onCancel={() => {}} />)
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('O nome do exemplo é obrigatório.')).toBeInTheDocument()
    expect(screen.getByText('O XML do exemplo é obrigatório.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('reprova nome sem letra nem número - o slug seria derivado para vazio', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn<ExemploFormProps['onSubmit']>()

    render(<ExemploForm onSubmit={onSubmit} onCancel={() => {}} />)

    preencherCampo(/Nome do cenário/, '---')
    preencherCampo(/XML/, '<nfse />')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByText('O nome precisa conter ao menos uma letra ou número.'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('resumo em branco vira undefined no payload, nunca string vazia', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn<ExemploFormProps['onSubmit']>()

    render(<ExemploForm onSubmit={onSubmit} onCancel={() => {}} />)

    preencherCampo(/Nome do cenário/, 'Nota simples')
    preencherCampo(/XML/, '<nfse />')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSubmit).toHaveBeenCalledWith({
      nome: 'Nota simples',
      descricao: undefined,
      xml: '<nfse />',
    })
  })

  it('na edição mostra a âncora atual e NÃO oferece campo de endereço', () => {
    render(<ExemploForm initialData={exemploExistente} onSubmit={() => {}} onCancel={() => {}} />)

    expect(screen.getByText('#exemplo-nota-simples')).toBeInTheDocument()
    // Renomear não recalcula slug: um campo de endereço aqui prometeria um
    // controle que o contrato de I41 não dá.
    expect(screen.queryByRole('textbox', { name: /endereço/i })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Nome do cenário/ })).toHaveValue('Nota simples')
  })
})
