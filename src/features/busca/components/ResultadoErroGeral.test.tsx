import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResultadoErroGeral } from './ResultadoErroGeral'

describe('ResultadoErroGeral', () => {
  it('renderiza o selo "Geral" com aria-label explicativo quando provedor/versão/versões são nulos', () => {
    render(<ResultadoErroGeral provedorNome={null} versaoRotulo={null} versoes={null} />)

    const selo = screen.getByText('Geral')
    expect(selo).toHaveAttribute('aria-label', 'Geral: este erro vale para qualquer provedor')
  })

  it('nunca renderiza um travessão nem célula vazia no lugar do selo', () => {
    render(<ResultadoErroGeral provedorNome={null} versaoRotulo={null} versoes={null} />)

    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('renderiza provedor e versão quando há contexto aplicável, nunca o selo "Geral"', () => {
    render(<ResultadoErroGeral provedorNome="IPM Sistemas" versaoRotulo="2.04" versoes={null} />)

    expect(screen.getByText('IPM Sistemas · 2.04')).toBeInTheDocument()
    expect(screen.queryByText('Geral')).not.toBeInTheDocument()
  })

  it('cai para a lista de versões quando não há versaoRotulo mas há versoes', () => {
    render(
      <ResultadoErroGeral
        provedorNome="Betha Sistemas"
        versaoRotulo={null}
        versoes={['2.01', '2.02']}
      />,
    )

    expect(screen.getByText('Betha Sistemas · 2.01, 2.02')).toBeInTheDocument()
  })
})

// P-09: com `provedorNome` nulo e `versoes` preenchido (erro que vale para
// versões de provedores diferentes), o separador abria a linha sozinho.
describe('ResultadoErroGeral — separador só entre partes presentes (P-09)', () => {
  it('sem provedor, mostra só as versões — sem separador órfão no início', () => {
    render(
      <ResultadoErroGeral provedorNome={null} versaoRotulo={null} versoes={['2.01', '2.02']} />,
    )

    expect(screen.getByText('2.01, 2.02')).toBeInTheDocument()
    expect(screen.queryByText(/^\s*·/)).not.toBeInTheDocument()
  })

  it('sem provedor mas com versaoRotulo, também não abre com separador', () => {
    render(<ResultadoErroGeral provedorNome={null} versaoRotulo="2.04" versoes={null} />)

    expect(screen.getByText('2.04')).toBeInTheDocument()
    expect(screen.queryByText(/^\s*·/)).not.toBeInTheDocument()
  })

  it('com provedor e sem versão, mostra só o provedor — sem separador sobrando no fim', () => {
    render(<ResultadoErroGeral provedorNome="IPM Sistemas" versaoRotulo={null} versoes={null} />)

    expect(screen.getByText('IPM Sistemas')).toBeInTheDocument()
    expect(screen.queryByText(/·\s*$/)).not.toBeInTheDocument()
  })

  // U9 é decidida pelos TRÊS campos nulos. Estes casos têm algum campo
  // preenchido, então o selo "Geral" não pode aparecer por engano.
  it('não mostra o selo "Geral" quando só o provedor está ausente', () => {
    render(<ResultadoErroGeral provedorNome={null} versaoRotulo={null} versoes={['2.01']} />)

    expect(screen.queryByText('Geral')).not.toBeInTheDocument()
  })
})
