import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { CampoVersaoPublico } from '../types/versaoProvedorPagina'
import { DetalheDoCampo } from './DetalheDoCampo'

// Valores tirados da carga real do Emissor Nacional 0.20: o CNPJ do prestador alimenta duas tags da
// DPS, e a nota de preenchimento chega em parágrafos.
const campoBase: CampoVersaoPublico = {
  campoLayoutSlug: 'prestador-cnpj-prest',
  nome: 'CNPJ_prest',
  caminhoXml: '//Prestador/CNPJ_prest',
  significado: 'CNPJ do prestador.',
  tipo: 'Texto',
  tamanho: '14',
  mascara: null,
  dominio: null,
  estadoPreenchimento: 'Condicional',
  condicao: null,
  exemplo: null,
  notaPreenchimento: null,
  destinoXml: 'DPS/infDPS/prest/CNPJ',
  notaTransformacao: null,
  ordem: 17,
  errosConhecidos: [],
}

function renderizar(campo: Partial<CampoVersaoPublico>) {
  render(<DetalheDoCampo campo={{ ...campoBase, ...campo }} id="detalhe" />)
  return screen.getByText('Destino no XML do provedor').closest('div')!
}

describe('DetalheDoCampo — destino no XML do provedor', () => {
  it('mostra um caminho por destino quando o campo vai para mais de uma tag', () => {
    const bloco = renderizar({ destinoXml: 'DPS/infDPS/prest/CNPJ | DPS/infDPS/prest/CPF' })

    const destinos = within(bloco)
      .getAllByRole('listitem')
      .map((item) => item.textContent)
    expect(destinos).toEqual(['DPS/infDPS/prest/CNPJ', 'DPS/infDPS/prest/CPF'])
  })

  it('o separador nunca aparece como parte de um caminho', () => {
    const bloco = renderizar({ destinoXml: 'DPS/infDPS/prest/CNPJ | DPS/infDPS/prest/CPF' })
    expect(bloco.textContent).not.toContain('|')
  })

  it('destino único continua um caminho só, sem lista', () => {
    const bloco = renderizar({ destinoXml: 'DPS/infDPS/prest/CNPJ' })

    expect(within(bloco).queryByRole('list')).not.toBeInTheDocument()
    expect(within(bloco).getByText('CNPJ')).toBeInTheDocument()
  })
})

describe('DetalheDoCampo — texto corrido', () => {
  it('a nota de preenchimento preserva os parágrafos', () => {
    renderizar({
      notaPreenchimento:
        'Na DPS: Número da inscrição federal (CNPJ) do prestador do serviço.\n\nFormato aceito pelo XSD: [0-9A-Z]{14}',
    })

    const nota = screen.getByText('Nota de preenchimento').nextElementSibling!
    expect(nota).toHaveClass('whitespace-pre-line')
    expect(nota.textContent).toContain('\n\nFormato aceito pelo XSD')
  })
})
