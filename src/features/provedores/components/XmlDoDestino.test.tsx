import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { XmlDoDestino } from './XmlDoDestino'

const CAMINHO_DO_VALOR_DO_SERVICO = 'DPS/infDPS/valores/vServPrest/vServ'
const EXEMPLO_DO_VALOR_DO_SERVICO = '29155.75'

function linhasDoXml(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-linha]'))
}

function textoDasLinhas(container: HTMLElement) {
  return linhasDoXml(container).map((linha) => linha.textContent)
}

describe('XmlDoDestino: o caminho lido como XML aninhado', () => {
  it('abre os ancestrais, põe o exemplo na folha e fecha na ordem inversa', () => {
    const { container } = render(
      <XmlDoDestino caminho={CAMINHO_DO_VALOR_DO_SERVICO} exemplo={EXEMPLO_DO_VALOR_DO_SERVICO} />,
    )

    expect(textoDasLinhas(container)).toEqual([
      '<DPS>',
      '<infDPS>',
      '<valores>',
      '<vServPrest>',
      '<vServ>29155.75</vServ>',
      '</vServPrest>',
      '</valores>',
      '</infDPS>',
      '</DPS>',
    ])
  })

  it('recua mais a cada nível na abertura e volta a recuar menos no fechamento', () => {
    const { container } = render(
      <XmlDoDestino caminho={CAMINHO_DO_VALOR_DO_SERVICO} exemplo={EXEMPLO_DO_VALOR_DO_SERVICO} />,
    )

    const linhas = linhasDoXml(container)

    expect(linhas.map((linha) => linha.dataset.nivel)).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '3',
      '2',
      '1',
      '0',
    ])
    expect(linhas.map((linha) => linha.style.paddingLeft)).toEqual([
      '1rem',
      '2rem',
      '3rem',
      '4rem',
      '5rem',
      '4rem',
      '3rem',
      '2rem',
      '1rem',
    ])
  })

  it('destaca uma só linha, e é a folha que recebe o valor', () => {
    const { container } = render(
      <XmlDoDestino caminho={CAMINHO_DO_VALOR_DO_SERVICO} exemplo={EXEMPLO_DO_VALOR_DO_SERVICO} />,
    )

    const alvos = container.querySelectorAll('[data-alvo]')

    expect(alvos).toHaveLength(1)
    expect(alvos[0]).toHaveTextContent('<vServ>29155.75</vServ>')
  })

  it('sem exemplo, mostra reticências na folha e nenhuma nota de exemplo real', () => {
    const { container } = render(<XmlDoDestino caminho="DPS/infDPS/vServ" exemplo={null} />)

    expect(textoDasLinhas(container)).toEqual([
      '<DPS>',
      '<infDPS>',
      '<vServ>…</vServ>',
      '</infDPS>',
      '</DPS>',
    ])
    expect(container.querySelector('figcaption')).toBeNull()
  })

  it('exemplo vazio vale como ausente', () => {
    const { container } = render(<XmlDoDestino caminho="DPS/infDPS/vServ" exemplo="" />)

    expect(textoDasLinhas(container)).toContain('<vServ>…</vServ>')
    expect(container.querySelector('figcaption')).toBeNull()
  })

  it('com exemplo, legenda a linha como exemplo real, fora do texto da linha', () => {
    const { container } = render(
      <XmlDoDestino caminho={CAMINHO_DO_VALOR_DO_SERVICO} exemplo={EXEMPLO_DO_VALOR_DO_SERVICO} />,
    )

    expect(container.querySelector('figcaption')).toHaveTextContent('exemplo real')
    expect(textoDasLinhas(container).join('')).not.toContain('exemplo real')
  })

  it('trata o valor como texto: nenhum elemento nasce de dentro dele', () => {
    const { container } = render(<XmlDoDestino caminho="DPS/infDPS/vServ" exemplo={'<b>&amp;"'} />)

    expect(container.querySelector('b')).toBeNull()
    expect(textoDasLinhas(container)).toContain('<vServ><b>&amp;"</vServ>')
  })

  it('caminho de um nível vira só a linha-alvo, sem abertura nem fechamento', () => {
    const { container } = render(<XmlDoDestino caminho="CNPJ" exemplo={null} />)

    expect(textoDasLinhas(container)).toEqual(['<CNPJ>…</CNPJ>'])
    expect(container.querySelectorAll('[data-alvo]')).toHaveLength(1)
  })

  it('nomeia o grupo pelo caminho completo, para o leitor de tela', () => {
    render(<XmlDoDestino caminho={CAMINHO_DO_VALOR_DO_SERVICO} exemplo={null} />)

    expect(
      screen.getByRole('group', {
        name: 'Caminho no XML do provedor: DPS/infDPS/valores/vServPrest/vServ',
      }),
    ).toBeInTheDocument()
  })

  it('caminho vazio não desenha nada', () => {
    const { container } = render(<XmlDoDestino caminho="" exemplo={null} />)

    expect(container).toBeEmptyDOMElement()
  })
})
