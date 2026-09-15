import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SumarioArtigo, extrairSecoesDoCorpo, gerarAncoraSecao } from './SumarioArtigo'

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
