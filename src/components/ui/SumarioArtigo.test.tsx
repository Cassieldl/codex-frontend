import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SumarioArtigo } from './SumarioArtigo'
import {
  agruparSecoes,
  extrairSecoesDoCorpo,
  gerarAncoraSecao,
  secaoDaAncora,
} from './secoesDoArtigo'
import { LIMIAR_SECAO_ATUAL_PX } from './useSecaoAtual'

describe('gerarAncoraSecao', () => {
  it('remove acentos e espaços, tudo minúsculo, unido por hífen', () => {
    expect(gerarAncoraSecao('Emissão de RPS')).toBe('secao-emissao-de-rps')
  })

  it('colapsa pontuação em um único hífen', () => {
    expect(gerarAncoraSecao('Passo 1: configurar credenciais')).toBe(
      'secao-passo-1-configurar-credenciais',
    )
  })
})

describe('extrairSecoesDoCorpo', () => {
  it('extrai h2/h3 na ordem em que aparecem no Markdown', () => {
    const corpo = [
      '# Título do artigo',
      '',
      '## Primeira seção',
      'Texto qualquer.',
      '',
      '### Sub-seção',
      'Mais texto.',
      '',
      '## Segunda seção',
    ].join('\n')

    expect(extrairSecoesDoCorpo(corpo)).toEqual([
      { nivel: 2, titulo: 'Primeira seção', ancora: 'secao-primeira-secao' },
      { nivel: 3, titulo: 'Sub-seção', ancora: 'secao-sub-secao' },
      { nivel: 2, titulo: 'Segunda seção', ancora: 'secao-segunda-secao' },
    ])
  })

  it('ignora h1 — só h2/h3 viram entrada de sumário', () => {
    expect(extrairSecoesDoCorpo('# Título\n\nTexto.')).toEqual([])
  })

  it('corpo sem nenhum h2/h3 retorna lista vazia', () => {
    expect(extrairSecoesDoCorpo('Só um parágrafo, sem título.')).toEqual([])
  })

  it('os h3 de um seletor ficam fora até o próximo h2', () => {
    const corpo = [
      '## Tabela do seu padrão',
      '',
      '> [!SELETOR] Padrão do município',
      '',
      '### GISS',
      '',
      '### IPM',
      '',
      '## Cuidados',
      '',
      '### Depois do seletor',
    ].join('\n')

    expect(extrairSecoesDoCorpo(corpo).map((item) => item.titulo)).toEqual([
      'Tabela do seu padrão',
      'Cuidados',
      'Depois do seletor',
    ])
  })
})

describe('secaoDaAncora', () => {
  it('acha a seção pela âncora do endereço, com ou sem acento codificado', () => {
    const titulos = ['Padrão Nacional', 'GISS']

    expect(secaoDaAncora(titulos, '#secao-giss')).toBe(1)
    expect(secaoDaAncora(titulos, '#secao-padrao-nacional')).toBe(0)
    expect(secaoDaAncora(titulos, '#outra')).toBe(-1)
    expect(secaoDaAncora(titulos, '#%E0%A4%A')).toBe(-1)
  })
})

describe('SumarioArtigo', () => {
  it('renderiza um link por seção, cada um apontando para a âncora derivada', () => {
    render(<SumarioArtigo corpo={'## Primeira seção\n\n### Detalhe'} />)

    expect(screen.getByRole('link', { name: 'Primeira seção' })).toHaveAttribute(
      'href',
      '#secao-primeira-secao',
    )
    expect(screen.getByRole('link', { name: 'Detalhe' })).toHaveAttribute('href', '#secao-detalhe')
  })

  it('não renderiza nada quando o corpo não tem h2/h3', () => {
    const { container } = render(<SumarioArtigo corpo="Só texto corrido." />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe('agruparSecoes', () => {
  it('põe cada h3 sob o h2 anterior; h3 antes de qualquer h2 fica no primeiro nível', () => {
    const grupos = agruparSecoes(
      extrairSecoesDoCorpo('### Antes\n## Um\n### Um.a\n### Um.b\n## Dois'),
    )

    expect(
      grupos.map((topico) => [topico.titulo, topico.subtopicos.map((sub) => sub.titulo)]),
    ).toEqual([
      ['Antes', []],
      ['Um', ['Um.a', 'Um.b']],
      ['Dois', []],
    ])
  })
})

const CORPO = '## Primeira seção\n\n### Detalhe\n\n## Segunda seção'

describe('SumarioArtigo — hierarquia', () => {
  it('o subtópico fica numa lista dentro do item do tópico, não ao lado dele', () => {
    render(<SumarioArtigo corpo={CORPO} />)

    const itemDoTopico = screen.getByRole('link', { name: 'Primeira seção' }).closest('li')!
    const itemDoSubtopico = screen.getByRole('link', { name: 'Detalhe' }).closest('li')!

    expect(itemDoSubtopico.parentElement?.closest('li')).toBe(itemDoTopico)
    expect(
      screen
        .getByRole('link', { name: 'Segunda seção' })
        .closest('li')
        ?.parentElement?.closest('li'),
    ).toBeNull()
  })

  it('sem título quando quem envolve o sumário já o intitula', () => {
    render(<SumarioArtigo corpo={CORPO} mostrarTitulo={false} />)

    expect(screen.queryByText('Nesta página')).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Sumário do artigo' })).toBeInTheDocument()
  })
})

describe('SumarioArtigo — seção em leitura', () => {
  const posicoes = new Map<string, number>()

  function montarTitulos() {
    for (const id of ['secao-primeira-secao', 'secao-detalhe', 'secao-segunda-secao']) {
      const titulo = document.createElement('h2')
      titulo.id = id
      titulo.getBoundingClientRect = () => ({ top: posicoes.get(id) ?? 1000 }) as DOMRect
      document.body.appendChild(titulo)
    }
  }

  function rolarAte(topos: Record<string, number>) {
    for (const [id, topo] of Object.entries(topos)) posicoes.set(id, topo)
    act(() => {
      fireEvent.scroll(window)
      vi.runAllTimers()
    })
  }

  function marcados() {
    return screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'location')
      .map((link) => link.textContent)
  }

  it('no fim da página marca a última seção, mesmo com o título dela longe do topo', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    montarTitulos()
    render(<SumarioArtigo corpo={CORPO} />)

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 500 })
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: window.innerHeight + 500,
    })
    try {
      rolarAte({ 'secao-primeira-secao': -300, 'secao-detalhe': 60, 'secao-segunda-secao': 400 })
      expect(marcados()).toEqual(['Segunda seção'])
    } finally {
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        configurable: true,
        value: 0,
      })
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    posicoes.clear()
    document.querySelectorAll('[id^="secao-"]').forEach((titulo) => titulo.remove())
  })

  it('marca exatamente uma seção: o último título que passou do limiar', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    montarTitulos()
    rolarAte({ 'secao-primeira-secao': 400, 'secao-detalhe': 800, 'secao-segunda-secao': 1200 })
    render(<SumarioArtigo corpo={CORPO} />)

    // Ainda na introdução: nenhum título passou do limiar.
    expect(marcados()).toEqual([])

    rolarAte({
      'secao-primeira-secao': -300,
      'secao-detalhe': LIMIAR_SECAO_ATUAL_PX,
      'secao-segunda-secao': 500,
    })
    expect(marcados()).toEqual(['Detalhe'])

    rolarAte({ 'secao-primeira-secao': -900, 'secao-detalhe': -500, 'secao-segunda-secao': 40 })
    expect(marcados()).toEqual(['Segunda seção'])
  })
})
