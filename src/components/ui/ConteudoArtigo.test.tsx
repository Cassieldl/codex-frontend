import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConteudoArtigo } from './ConteudoArtigo'

describe('ConteudoArtigo — segurança do renderizador de Markdown (U-4)', () => {
  it('renderiza elementos permitidos normalmente', () => {
    render(<ConteudoArtigo corpo={'## Título\n\nUm **parágrafo** com texto.'} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Título' })).toBeInTheDocument()
    expect(screen.getByText('parágrafo')).toBeInTheDocument()
  })

  it('h1 dentro do corpo não vira <h1> — título do artigo é o único h1 da página', () => {
    const { container } = render(<ConteudoArtigo corpo="# Título proibido no corpo" />)

    expect(container.querySelector('h1')).not.toBeInTheDocument()
  })

  /**
   * Quem fecha este vetor é a AUSÊNCIA de `rehype-raw` — sem ele o react-markdown nunca
   * transforma HTML bruto em elemento — reforçada pela allowlist. Medido por mutação: remover
   * `skipHtml` do componente deixa os 9 testes deste arquivo verdes; remover a allowlist derruba
   * 2. Ou seja, `skipHtml` é terceira camada e **não tem detector próprio** — está lá como defesa
   * em profundidade, não como a linha que sustenta a garantia.
   *
   * Consequência prática: se alguém algum dia instalar `rehype-raw`, este teste é o que precisa
   * ficar vermelho. Não renomeie atribuindo a proteção ao `skipHtml`.
   */
  it('HTML bruto no corpo nunca é interpretado como HTML (sem rehype-raw + allowlist)', () => {
    const { container } = render(
      <ConteudoArtigo corpo={'Texto normal.\n\n<script>window.__xss = true</script>'} />,
    )

    expect(container.querySelector('script')).not.toBeInTheDocument()
    expect((window as unknown as { __xss?: boolean }).__xss).toBeUndefined()
  })

  it('imagem (fora da allowlist) não renderiza', () => {
    const { container } = render(<ConteudoArtigo corpo="![alt de teste](/x.png)" />)

    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('link externo http(s) ganha target="_blank" e rel="noopener noreferrer"', () => {
    render(<ConteudoArtigo corpo="[InvoiCy](https://invoicy.com.br)" />)

    const link = screen.getByRole('link', { name: 'InvoiCy' })
    expect(link).toHaveAttribute('href', 'https://invoicy.com.br')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('link interno relativo não ganha target/rel de link externo', () => {
    render(<ConteudoArtigo corpo="[Outro artigo](/artigos/outro)" />)

    const link = screen.getByRole('link', { name: 'Outro artigo' })
    expect(link).toHaveAttribute('href', '/artigos/outro')
    expect(link).not.toHaveAttribute('target')
  })

  it('link com esquema javascript: vira texto puro, nunca <a href="javascript:...">', () => {
    render(<ConteudoArtigo corpo={'[clique](javascript:alert(1))'} />)

    expect(screen.queryByRole('link', { name: 'clique' })).not.toBeInTheDocument()
    expect(screen.getByText('clique')).toBeInTheDocument()
  })

  it('tabela GFM renderiza com thead/tbody (remark-gfm + allowlist)', () => {
    const corpo = ['| A | B |', '| - | - |', '| 1 | 2 |'].join('\n')
    const { container } = render(<ConteudoArtigo corpo={corpo} />)

    expect(container.querySelector('table')).toBeInTheDocument()
    expect(container.querySelector('thead')).toBeInTheDocument()
    expect(container.querySelector('tbody')).toBeInTheDocument()
  })

  it('h2/h3 renderizados ganham id igual à âncora que SumarioArtigo gera (mesmo algoritmo)', () => {
    render(<ConteudoArtigo corpo="## Emissão de RPS" />)

    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'secao-emissao-de-rps')
  })
})
