import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AvisoPublico } from '../types/provedor'
import { AvisosProvedor } from './AvisosProvedor'
import { AvisosVersao } from './AvisosVersao'

const CORPO_EM_PARAGRAFOS = 'Primeiro parágrafo.\n\nSegundo parágrafo:\n- item um\n- item dois'

const avisoDeProvedor: AvisoPublico = {
  id: 7,
  escopo: 'provedor',
  severidade: 'Alerta',
  titulo: 'Certificado digital expira em breve',
  corpo: 'Renove o certificado A1 antes do vencimento.',
  vigenciaInicio: '2026-08-01',
  camposAfetados: [],
}

const avisoDeVersao: AvisoPublico = {
  id: 12,
  escopo: 'versao',
  severidade: 'Critico',
  titulo: 'O ISSRetido passou a ser obrigatório',
  corpo: CORPO_EM_PARAGRAFOS,
  vigenciaInicio: '2026-10-05',
  camposAfetados: [
    {
      campoLayoutSlug: 'servico-valores-issretido',
      nome: 'ISSRetido',
      caminhoXml: '//Servico/Valores/ISSRetido',
    },
    {
      campoLayoutSlug: 'servico-valores-valoriss',
      nome: 'ValorIss',
      caminhoXml: '//Servico/Valores/ValorIss',
    },
  ],
}

// O jsdom não implementa `scrollIntoView`; a lista o chama ao chegar por âncora.
const rolarParaOElemento = vi.fn()

beforeEach(() => {
  Element.prototype.scrollIntoView = rolarParaOElemento
})

afterEach(() => {
  rolarParaOElemento.mockClear()
  window.history.replaceState({}, '', '/')
})

describe('AvisosProvedor', () => {
  it('renderiza a seção "Avisos do provedor" com o subtítulo fixo', () => {
    render(<AvisosProvedor nomeProvedor="Prefeitura de Exemplo" avisos={[avisoDeProvedor]} />)

    expect(screen.getByRole('heading', { name: 'Avisos do provedor' })).toBeInTheDocument()
    expect(
      screen.getByText('Valem para Prefeitura de Exemplo em qualquer versão.'),
    ).toBeInTheDocument()
    expect(screen.getByText(avisoDeProvedor.titulo)).toBeInTheDocument()
  })

  it('não renderiza nada quando a lista de avisos está vazia', () => {
    const { container } = render(
      <AvisosProvedor nomeProvedor="Prefeitura de Exemplo" avisos={[]} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('nunca mistura com os avisos de versão — títulos de seção distintos', () => {
    render(
      <>
        <AvisosProvedor nomeProvedor="Prefeitura de Exemplo" avisos={[avisoDeProvedor]} />
        <AvisosVersao avisos={[avisoDeVersao]} />
      </>,
    )

    expect(screen.getByRole('heading', { name: 'Avisos do provedor' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Avisos desta versão' })).toBeInTheDocument()
    expect(screen.getByText(avisoDeProvedor.titulo)).toBeInTheDocument()
    expect(screen.getByText(avisoDeVersao.titulo)).toBeInTheDocument()
  })

  it('aviso de provedor não tem bloco "Campos afetados"', () => {
    render(<AvisosProvedor nomeProvedor="Prefeitura de Exemplo" avisos={[avisoDeProvedor]} />)

    expect(screen.queryByText('Campos afetados')).not.toBeInTheDocument()
  })

  it('dá a cada aviso a âncora própria #aviso-{id}', () => {
    const { container } = render(
      <AvisosProvedor nomeProvedor="Prefeitura de Exemplo" avisos={[avisoDeProvedor]} />,
    )

    expect(container.querySelector('li#aviso-7')).not.toBeNull()
  })

  it('com as duas listas na página, a âncora rola uma vez só e destaca só o aviso dono dela', () => {
    // Cada lista só reage ao que é seu: sem isso, as duas tentariam rolar até o mesmo aviso.
    window.history.replaceState({}, '', '/#aviso-12')

    const { container } = render(
      <>
        <AvisosProvedor nomeProvedor="Prefeitura de Exemplo" avisos={[avisoDeProvedor]} />
        <AvisosVersao avisos={[avisoDeVersao]} />
      </>,
    )

    expect(rolarParaOElemento).toHaveBeenCalledTimes(1)
    expect(rolarParaOElemento.mock.contexts[0]).toBe(container.querySelector('#aviso-12'))
    expect(container.querySelector('#aviso-12')).toHaveClass('bg-highlight-anchor')
    expect(container.querySelector('#aviso-7')).not.toHaveClass('bg-highlight-anchor')
  })
})

describe('AvisosVersao', () => {
  it('dá a cada aviso a âncora própria #aviso-{id}', () => {
    const { container } = render(<AvisosVersao avisos={[avisoDeVersao]} />)

    expect(container.querySelector('li#aviso-12')).not.toBeNull()
  })

  it('lista os campos afetados como links para a linha do campo na tabela', () => {
    render(<AvisosVersao avisos={[avisoDeVersao]} />)

    expect(screen.getByText('Campos afetados')).toBeInTheDocument()

    const linkIssRetido = screen.getByRole('link', { name: 'ISSRetido' })
    expect(linkIssRetido).toHaveAttribute('href', '#campo-servico-valores-issretido')
    expect(linkIssRetido).toHaveClass('font-mono')
    expect(screen.getByRole('link', { name: 'ValorIss' })).toHaveAttribute(
      'href',
      '#campo-servico-valores-valoriss',
    )
  })

  it('aviso de versão sem campos afetados não mostra o bloco', () => {
    render(<AvisosVersao avisos={[{ ...avisoDeVersao, camposAfetados: [] }]} />)

    expect(screen.queryByText('Campos afetados')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'ISSRetido' })).not.toBeInTheDocument()
  })

  it('preserva parágrafos e listas do corpo', () => {
    const { container } = render(<AvisosVersao avisos={[avisoDeVersao]} />)

    const paragrafos = container.querySelectorAll('#aviso-12 details > div p')
    const itens = container.querySelectorAll('#aviso-12 ul.list-disc > li')
    expect([...paragrafos].map((p) => p.textContent)).toEqual([
      'Primeiro parágrafo.',
      'Segundo parágrafo:',
    ])
    expect([...itens].map((li) => li.textContent)).toEqual(['item um', 'item dois'])
  })

  it('tag de XML escrita sem crase aparece como texto, não some', () => {
    const corpo = 'Com <nfse_teste>1</nfse_teste> logo depois de <nfse>, o IPM só valida.'
    const { container } = render(<AvisosVersao avisos={[{ ...avisoDeVersao, corpo }]} />)

    expect(container.querySelector('#aviso-12 details > div')).toHaveTextContent(corpo)
    expect(container.querySelector('#aviso-12 nfse_teste')).toBeNull()
  })

  it('mostra o print do corpo quando o caminho está em /imagens/', () => {
    const corpo = 'Gere o token no portal.\n\n![Menu Token Web Service](/imagens/rlz/token.jpg)'
    render(<AvisosVersao avisos={[{ ...avisoDeVersao, corpo }]} />)

    expect(screen.getByRole('img', { name: 'Menu Token Web Service' })).toHaveAttribute(
      'src',
      '/imagens/rlz/token.jpg',
    )
  })

  it('mostra a vigência por extenso', () => {
    render(<AvisosVersao avisos={[avisoDeVersao]} />)

    expect(screen.getByText('desde 05 de outubro de 2026')).toBeInTheDocument()
  })

  it('o botão de copiar link entrega o endereço da página atual com a âncora do aviso', async () => {
    window.history.replaceState({}, '', '/provedores/prefeitura-exemplo/v1')
    const escrito: string[] = []
    Object.assign(navigator, {
      clipboard: {
        writeText: (texto: string) => {
          escrito.push(texto)
          return Promise.resolve()
        },
      },
    })

    render(<AvisosVersao avisos={[avisoDeVersao]} />)

    fireEvent.click(
      screen.getByRole('button', { name: `Copiar link do aviso ${avisoDeVersao.titulo}` }),
    )

    await vi.waitFor(() => expect(escrito).toHaveLength(1))
    expect(escrito[0]).toBe(`${window.location.origin}/provedores/prefeitura-exemplo/v1#aviso-12`)
  })

  it('chegar por #aviso-{id} rola até o aviso e o destaca', () => {
    window.history.replaceState({}, '', '/#aviso-12')

    const { container } = render(<AvisosVersao avisos={[avisoDeVersao]} />)

    expect(rolarParaOElemento).toHaveBeenCalledTimes(1)
    expect(rolarParaOElemento.mock.contexts[0]).toBe(container.querySelector('#aviso-12'))
    expect(container.querySelector('#aviso-12')).toHaveClass('bg-highlight-anchor')
  })

  it('sem âncora de aviso na URL, nada é rolado nem destacado', () => {
    window.history.replaceState({}, '', '/#campo-servico-valores-issretido')

    const { container } = render(<AvisosVersao avisos={[avisoDeVersao]} />)

    expect(rolarParaOElemento).not.toHaveBeenCalled()
    expect(container.querySelector('#aviso-12')).not.toHaveClass('bg-highlight-anchor')
  })
})

describe('AvisoPublicoItem — recolhido até ser aberto', () => {
  function detalhesDo(container: HTMLElement, id: number) {
    return container.querySelector(`#aviso-${id} details`) as HTMLDetailsElement
  }

  it('alerta e informativo abrem recolhidos, só com o título à vista', () => {
    const informativo: AvisoPublico = { ...avisoDeProvedor, id: 8, severidade: 'Informativo' }
    const { container } = render(
      <AvisosProvedor
        nomeProvedor="Prefeitura de Exemplo"
        avisos={[avisoDeProvedor, informativo]}
      />,
    )

    expect(detalhesDo(container, 7).open).toBe(false)
    expect(detalhesDo(container, 8).open).toBe(false)
    expect(
      within(detalhesDo(container, 7).querySelector('summary')!).getByRole('heading', {
        name: avisoDeProvedor.titulo,
      }),
    ).toBeInTheDocument()
  })

  it('o crítico já abre aberto: não pode ficar atrás de um clique', () => {
    const { container } = render(<AvisosVersao avisos={[avisoDeVersao]} />)

    expect(detalhesDo(container, 12).open).toBe(true)
  })

  it('fechado, mostra só a primeira frase do corpo; aberto, a frase sai e o corpo inteiro aparece', () => {
    const aviso: AvisoPublico = {
      ...avisoDeProvedor,
      corpo: 'Peça a faixa **antes** da primeira nota. Sem ela, o retorno é E157.',
    }
    const { container } = render(
      <AvisosProvedor nomeProvedor="Prefeitura de Exemplo" avisos={[aviso]} />,
    )
    const resumo = detalhesDo(container, 7).querySelector('summary')!

    expect(resumo).toHaveTextContent('Peça a faixa antes da primeira nota.')
    expect(resumo).not.toHaveTextContent('Sem ela')
    fireEvent.click(resumo)
    expect(detalhesDo(container, 7).open).toBe(true)
    // O jsdom não dispara o `toggle` sozinho; o navegador dispara.
    fireEvent(detalhesDo(container, 7), new Event('toggle'))
    expect(resumo.querySelector('[data-primeira-frase]')).toBeNull()
  })

  it('o link de cada aviso fica na ordem do Tab mesmo fechado, e aparece com o foco dentro do aviso', () => {
    render(<AvisosProvedor nomeProvedor="Prefeitura de Exemplo" avisos={[avisoDeProvedor]} />)

    const botao = screen.getByRole('button', {
      name: `Copiar link do aviso ${avisoDeProvedor.titulo}`,
    })

    expect(botao).not.toHaveAttribute('tabindex', '-1')
    expect(botao).toHaveClass('opacity-0', 'group-focus-within/aviso:opacity-100')
  })

  it('aberto, o link do aviso fica sempre visível', () => {
    render(<AvisosVersao avisos={[avisoDeVersao]} />)

    expect(
      screen.getByRole('button', { name: `Copiar link do aviso ${avisoDeVersao.titulo}` }),
    ).toHaveClass('opacity-100')
  })

  it('ordena por gravidade: crítico, atenção e informação, mesmo que a API mande em outra ordem', () => {
    const informativo: AvisoPublico = {
      ...avisoDeProvedor,
      id: 1,
      severidade: 'Informativo',
      titulo: 'Campos em confirmação',
    }
    const critico: AvisoPublico = {
      ...avisoDeProvedor,
      id: 2,
      severidade: 'Critico',
      titulo: 'Liberação',
    }

    render(
      <AvisosProvedor
        nomeProvedor="Prefeitura de Exemplo"
        avisos={[informativo, avisoDeProvedor, critico]}
      />,
    )

    expect(
      screen.getAllByRole('heading', { level: 3 }).map((titulo) => titulo.textContent),
    ).toEqual(['Liberação', avisoDeProvedor.titulo, 'Campos em confirmação'])
  })

  it('o aviso apontado pela âncora abre, mesmo não sendo crítico', () => {
    window.history.replaceState({}, '', '/#aviso-7')

    const { container } = render(
      <AvisosProvedor nomeProvedor="Prefeitura de Exemplo" avisos={[avisoDeProvedor]} />,
    )

    expect(detalhesDo(container, 7).open).toBe(true)
  })

  it('a âncora que muda depois da montagem abre o aviso novo', () => {
    const { container } = render(
      <AvisosProvedor nomeProvedor="Prefeitura de Exemplo" avisos={[avisoDeProvedor]} />,
    )
    expect(detalhesDo(container, 7).open).toBe(false)

    act(() => {
      window.history.replaceState({}, '', '/#aviso-7')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(detalhesDo(container, 7).open).toBe(true)
  })

  it('copiar o link não depende de abrir o aviso', () => {
    render(<AvisosProvedor nomeProvedor="Prefeitura de Exemplo" avisos={[avisoDeProvedor]} />)

    const botao = screen.getByRole('button', {
      name: `Copiar link do aviso ${avisoDeProvedor.titulo}`,
    })
    expect(botao.closest('details')).toBeNull()
  })
})
