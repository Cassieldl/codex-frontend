import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExemploPublico } from '../types/exemplo'
import { ExemplosVersao } from './ExemplosVersao'

const XML_SEM_TOMADOR = '<Rps>\n  <Tomador/>\n</Rps>'

const exemplos: ExemploPublico[] = [
  {
    slug: 'sem-tomador',
    nome: 'Emissão sem tomador identificado',
    descricao: 'Serviço de R$ 180,00 a consumidor final.',
    xml: XML_SEM_TOMADOR,
  },
  {
    slug: 'iss-retido',
    nome: 'ISS retido na fonte',
    descricao: null,
    xml: '<Valores>\n  <ValorIssRetido>250.00</ValorIssRetido>\n</Valores>',
  },
]

function renderizar(lista: ExemploPublico[] = exemplos) {
  return render(<ExemplosVersao exemplos={lista} provedorSlug="ipm" />)
}

// O jsdom não implementa `scrollIntoView`; o componente o chama ao abrir por âncora.
Element.prototype.scrollIntoView = vi.fn()

// `userEvent.setup()` substitui `navigator.clipboard` por uma Clipboard própria - por isso
// espionamos o método já existente, sempre DEPOIS do setup (mesmo padrão de `BotaoCopiar.test.tsx`).
function configurarUsuarioComClipboard() {
  const usuario = userEvent.setup()
  const escreverNaAreaDeTransferencia = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue(undefined)
  return { usuario, escreverNaAreaDeTransferencia }
}

// `getByText` normaliza whitespace, e o XML é multilinha: buscar pela string crua não casa - e a
// asserção de AUSÊNCIA correspondente passaria por acidente, sempre. Lemos o bloco pelo elemento.
function xmlVisivel(): string[] {
  return Array.from(document.querySelectorAll('code')).map((bloco) => bloco.textContent ?? '')
}

afterEach(() => {
  window.location.hash = ''
})

describe('ExemplosVersao (tela 5)', () => {
  it('com `exemplos: []` não renderiza a seção - nem título, nem estado vazio', () => {
    renderizar([])

    expect(screen.queryByRole('heading', { name: 'Exemplos' })).not.toBeInTheDocument()
    expect(screen.queryByText(/nenhum exemplo/i)).not.toBeInTheDocument()
  })

  it('lista os cenários fechados: o XML só aparece depois de abrir', async () => {
    const usuario = userEvent.setup()
    renderizar()

    expect(screen.getByRole('heading', { name: 'Exemplos' })).toBeInTheDocument()
    expect(xmlVisivel()).toHaveLength(0)

    // Um botão por cenário, todos fechados: nenhum "Fechar o XML" antes do clique.
    expect(screen.getAllByRole('button', { name: 'Ver o XML' })).toHaveLength(exemplos.length)
    expect(screen.queryByRole('button', { name: 'Fechar o XML' })).not.toBeInTheDocument()

    await usuario.click(screen.getAllByRole('button', { name: 'Ver o XML' })[0])

    // Igualdade exata: o XML tem de chegar com as quebras de linha que o emissor envia.
    expect(xmlVisivel()).toEqual([XML_SEM_TOMADOR])
    expect(screen.getAllByRole('button', { name: 'Fechar o XML' })).toHaveLength(1)
  })

  it('abrir um cenário fecha o anterior e `aria-expanded` acompanha', async () => {
    const usuario = userEvent.setup()
    renderizar()

    const [primeiro, segundo] = screen.getAllByRole('button', { name: 'Ver o XML' })
    await usuario.click(primeiro)
    expect(primeiro).toHaveAttribute('aria-expanded', 'true')
    expect(segundo).toHaveAttribute('aria-expanded', 'false')

    await usuario.click(segundo)
    expect(xmlVisivel()).toEqual([exemplos[1].xml])
    expect(segundo).toHaveAttribute('aria-expanded', 'true')

    await usuario.click(segundo)
    expect(segundo).toHaveAttribute('aria-expanded', 'false')
  })

  it('cada cenário tem o id da âncora `#exemplo-{slug}`', () => {
    const { container } = renderizar()

    expect(container.querySelector('#exemplo-sem-tomador')).not.toBeNull()
    expect(container.querySelector('#exemplo-iss-retido')).not.toBeNull()
  })

  it('chegar por `#exemplo-{slug}` abre aquele cenário, e só ele', () => {
    window.location.hash = '#exemplo-iss-retido'
    renderizar()

    // Exatamente um bloco aberto, e é o da âncora - não basta afirmar que o certo apareceu.
    expect(xmlVisivel()).toEqual([exemplos[1].xml])
  })

  it('copia o link do provedor com a âncora do cenário, sem versão no endereço', async () => {
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    renderizar()

    await usuario.click(
      screen.getByRole('button', { name: 'Copiar link do exemplo ISS retido na fonte' }),
    )

    expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith(
      `${window.location.origin}/provedores/ipm#exemplo-iss-retido`,
    )
  })

  /** WCAG 2.1.1: o bloco de XML rola, e quem navega por teclado precisa alcançá-lo. */
  it('o bloco de XML recebe foco de teclado e tem rótulo próprio', async () => {
    const usuario = userEvent.setup()
    renderizar([{ slug: 'iss-retido', nome: 'ISS retido', descricao: null, xml: '<Rps />' }])

    await usuario.click(screen.getByRole('button', { name: 'Ver o XML' }))

    const bloco = screen.getByRole('region', { name: 'XML do exemplo ISS retido' })
    expect(bloco.tagName).toBe('PRE')
    expect(bloco).toHaveAttribute('tabindex', '0')
  })

  it('o XML é texto, nunca HTML interpretado', async () => {
    const usuario = userEvent.setup()
    const xmlHostil = '<Rps><script>alert(1)</script></Rps>'
    renderizar([{ slug: 'hostil', nome: 'Cenário hostil', descricao: null, xml: xmlHostil }])

    await usuario.click(screen.getByRole('button', { name: 'Ver o XML' }))

    const bloco = screen.getByText(xmlHostil)
    expect(bloco.tagName).toBe('CODE')
    expect(bloco.querySelector('script')).toBeNull()
  })
})
