import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ConteudoArtigo } from './ConteudoArtigo'

const CORPO_COM_SELETOR = [
  '## Tabela do seu padrão',
  '',
  '> [!SELETOR] Padrão do município',
  '> Cada tabela mostra o código que você envia.',
  '',
  '### Padrão Nacional',
  '',
  '| Código no InvoiCy | Valor na prefeitura |',
  '| :--- | :--- |',
  '| 4 | 2 |',
  '',
  '> [!DETALHES] Quais provedores usam esta tabela?',
  '> Emissor Nacional e Betha.',
  '',
  '### GISS',
  '',
  '| Código no InvoiCy | Valor na prefeitura |',
  '| :--- | :--- |',
  '| 4 | 5 |',
  '',
  '## Cuidados',
  '',
  'Texto depois do seletor.',
].join('\n')

/** O painel escondido sai da árvore de acessibilidade; a busca é pelo atributo. */
function painel(nome: string): HTMLElement {
  const encontrado = document.querySelector<HTMLElement>(`section[aria-label="${nome}"]`)
  if (!encontrado) throw new Error(`painel ${nome} não existe`)
  return encontrado
}

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('ConteudoArtigo: [!SELETOR] mostra uma seção por vez', () => {
  it('cada h3 até o próximo h2 vira opção, e só a primeira aparece', () => {
    render(<ConteudoArtigo corpo={CORPO_COM_SELETOR} />)

    const seletor = screen.getByRole('combobox', { name: 'Padrão do município' })
    expect(
      within(seletor)
        .getAllByRole('option')
        .map((opcao) => opcao.textContent),
    ).toEqual(['Padrão Nacional', 'GISS'])
    expect(painel('Padrão Nacional')).toBeVisible()
    expect(painel('GISS')).not.toBeVisible()
    expect(screen.getByText('Cada tabela mostra o código que você envia.')).toBeVisible()
    expect(screen.queryByText(/\[!SELETOR\]/)).not.toBeInTheDocument()
    // O h2 seguinte fecha a região: fica fora de qualquer painel.
    expect(screen.getByText('Texto depois do seletor.').closest('section')).toBeNull()
  })

  it('trocar a opção pelo teclado mostra a outra tabela sem sair da página', async () => {
    const usuario = userEvent.setup()
    render(<ConteudoArtigo corpo={CORPO_COM_SELETOR} />)
    const seletor = screen.getByRole('combobox', { name: 'Padrão do município' })

    seletor.focus()
    await usuario.selectOptions(seletor, 'GISS')

    expect(seletor).toHaveFocus()
    expect(painel('GISS')).toBeVisible()
    expect(painel('Padrão Nacional')).not.toBeVisible()
    expect(seletor).toHaveAttribute('aria-controls', painel('GISS').id)
  })

  it('link com a âncora de uma seção escondida abre essa seção', () => {
    window.history.replaceState(null, '', '/artigos/natop#secao-giss')
    render(<ConteudoArtigo corpo={CORPO_COM_SELETOR} />)

    expect(screen.getByRole('combobox', { name: 'Padrão do município' })).toHaveValue('1')
    expect(painel('GISS')).toBeVisible()
  })

  it('com uma seção só, nada muda: o marcador e o h3 continuam visíveis', () => {
    render(<ConteudoArtigo corpo={'> [!SELETOR] Padrão\n\n### Único\n\nTexto.\n\n## Depois'} />)

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText(/\[!SELETOR\] Padrão/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Único' })).toBeVisible()
  })

  it('HTML cru dentro de um painel nunca vira elemento', () => {
    const corpo = CORPO_COM_SELETOR.replace(
      '| 4 | 5 |',
      '| 4 | 5 |\n\n<img src=x onerror="window.__xssSeletor=true"><script>window.__xssSeletor=true</script>',
    )
    const { container } = render(<ConteudoArtigo corpo={corpo} />)

    expect(container.querySelector('script, img[onerror]')).not.toBeInTheDocument()
    expect((window as unknown as { __xssSeletor?: boolean }).__xssSeletor).toBeUndefined()
  })
})

describe('ConteudoArtigo: [!CONVERSAO] e [!COLUNAS]', () => {
  it('[!CONVERSAO] mostra o código enviado e o valor de cada destino', () => {
    const { container } = render(
      <ConteudoArtigo
        corpo={'> [!CONVERSAO] natOp 4\n>\n> - Padrão Nacional | 2\n> - Caucaia WS | 4'}
      />,
    )

    const bloco = container.querySelector('[data-bloco="conversao"]') as HTMLElement
    expect(within(bloco).getByText('natOp 4').tagName).toBe('CODE')
    const linhas = within(bloco).getAllByRole('listitem')
    expect(linhas.map((linha) => linha.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Padrão Nacional 2',
      'Caucaia WS 4',
    ])
  })

  it('[!CONVERSAO] sem o código ou com item fora da forma continua citação', () => {
    const { container } = render(
      <ConteudoArtigo corpo={'> [!CONVERSAO] natOp 4\n>\n> - Padrão Nacional sem valor'} />,
    )

    expect(container.querySelector('[data-bloco="conversao"]')).not.toBeInTheDocument()
    expect(screen.getByText(/\[!CONVERSAO\]/)).toBeInTheDocument()
  })

  it('[!COLUNAS] vira um cartão por h3, e lista só de links vira linhas de link', () => {
    const corpo = [
      '> [!COLUNAS]',
      '> ### Pela tela',
      '>',
      '> Abra o painel.',
      '>',
      '> ### Pelo webservice',
      '>',
      '> - [WSDL de produção](https://app.invoicy.com.br/arecepcao.aspx?wsdl)',
    ].join('\n')
    const { container } = render(<ConteudoArtigo corpo={corpo} />)

    const cartoes = container.querySelectorAll('[data-bloco="colunas"] > ul > li')
    expect(cartoes).toHaveLength(2)
    expect(within(cartoes[0] as HTMLElement).getByRole('heading', { level: 3 })).toHaveTextContent(
      'Pela tela',
    )
    const link = within(cartoes[1] as HTMLElement).getByRole('link', { name: /WSDL de produção/ })
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('ConteudoArtigo: título h3 seguido de tabela vira um grupo', () => {
  it('título, tabela e o alerta logo depois ficam no mesmo card', () => {
    const corpo = [
      '### Documento emitido',
      '',
      '| Notificação | Quando |',
      '| :--- | :--- |',
      '| A | B |',
      '',
      '> [!DICA]',
      '> Dica do grupo.',
      '',
      'Parágrafo fora.',
    ].join('\n')
    const { container } = render(<ConteudoArtigo corpo={corpo} />)

    const grupo = container.querySelector('[data-bloco="grupoDeTabela"]') as HTMLElement
    expect(within(grupo).getByRole('heading', { level: 3 })).toHaveAttribute(
      'id',
      'secao-documento-emitido',
    )
    expect(within(grupo).getByRole('table')).toBeInTheDocument()
    expect(within(grupo).getByText('Dica do grupo.')).toBeInTheDocument()
    expect(within(grupo).queryByText('Parágrafo fora.')).not.toBeInTheDocument()
  })
})

describe('ConteudoArtigo: corpo sem os blocos novos não muda', () => {
  it('h3 com parágrafo antes da tabela, citação e lista seguem soltos no corpo', () => {
    const corpo = [
      '## Seção',
      '',
      '### Subseção',
      '',
      'Antes da tabela.',
      '',
      '| A | B |',
      '| :--- | :--- |',
      '| 1 | 2 |',
      '',
      '> Citação comum.',
      '',
      '- item',
    ].join('\n')
    const { container } = render(<ConteudoArtigo corpo={corpo} />)
    const raiz = container.firstElementChild as HTMLElement

    expect(container.querySelector('[data-bloco]')).not.toBeInTheDocument()
    expect(container.querySelector('select')).not.toBeInTheDocument()
    expect([...raiz.children].map((filho) => filho.tagName)).toEqual([
      'H2',
      'H3',
      'P',
      'DIV',
      'BLOCKQUOTE',
      'UL',
    ])
  })
})
