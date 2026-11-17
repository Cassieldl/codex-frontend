import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it.each([
    '/x.png',
    'https://exemplo.com/imagens/a.png',
    'data:image/png;base64,AAAA',
    'javascript:alert(1)',
    '//exemplo.com/imagens/a.png',
    '/imagens/../segredo.png',
    '../../assets/imagens/a.png',
  ])('imagem com src %s não vira <img> e mostra só o alt', (src) => {
    const { container } = render(<ConteudoArtigo corpo={`![alt de teste](${src})`} />)

    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByText('alt de teste')).toBeInTheDocument()
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

describe('ConteudoArtigo: blocos visuais', () => {
  it('[!RESUMO] vira cartão rotulado e o marcador some do texto', () => {
    render(<ConteudoArtigo corpo={'> [!RESUMO]\n> Duas linhas do essencial.'} />)

    const cartao = screen.getByRole('note', { name: 'Resumo rápido' })
    expect(cartao).toHaveTextContent('Duas linhas do essencial.')
    expect(cartao).not.toHaveTextContent('[!RESUMO]')
  })

  it.each([
    ['DICA', 'Dica'],
    ['ATENCAO', 'Atenção'],
    ['IMPORTANTE', 'Importante'],
  ])('[!%s] vira caixa com rótulo visível "%s"', (marcador, rotulo) => {
    const { container } = render(<ConteudoArtigo corpo={`> [!${marcador}] Confira o ambiente.`} />)

    expect(screen.getByRole('note', { name: rotulo })).toHaveTextContent('Confira o ambiente.')
    expect(container.querySelector('blockquote')).not.toBeInTheDocument()
    expect(container).not.toHaveTextContent(`[!${marcador}]`)
  })

  it.each([
    ['DICA', 'informacao'],
    ['IMPORTANTE', 'alerta'],
    ['ATENCAO', 'erro'],
    ['SUCESSO', 'sucesso'],
  ])('[!%s] vira o alerta Migrate do tipo %s', (marcador, tipo) => {
    const { container } = render(<ConteudoArtigo corpo={`> [!${marcador}]\n> Corpo do alerta.`} />)

    expect(container.querySelector(`[data-alerta="${tipo}"]`)).toHaveTextContent('Corpo do alerta.')
  })

  it('texto na linha do marcador vira título quando há corpo depois; sozinho, continua corpo', () => {
    render(
      <ConteudoArtigo
        corpo={'> [!DICA] Erro novo?\n> Veja o comunicado.\n\n> [!SUCESSO] Tudo certo.'}
      />,
    )

    const comTitulo = screen.getByRole('note', { name: 'Erro novo?' })
    expect(comTitulo).toHaveTextContent('Veja o comunicado.')
    expect(screen.getByRole('note', { name: 'Sucesso' })).toHaveTextContent('Tudo certo.')
  })

  it('[!CARTOES] vira grade de cartões; o link da ação cobre o cartão inteiro', () => {
    const corpo = [
      '> [!CARTOES]',
      '> - **Código do erro** | Cole como veio. | [Ex.: E157](/busca?q=E157)',
      '> - **Provedor** | Tudo o que está documentado.',
    ].join('\n')
    const { container } = render(<ConteudoArtigo corpo={corpo} />)

    const cartoes = container.querySelectorAll('ul > li')
    expect(cartoes).toHaveLength(2)
    const link = screen.getByRole('link', { name: 'Ex.: E157' })
    expect(cartoes[0]).toContainElement(link)
    expect(link).toHaveAttribute('href', '/busca?q=E157')
    expect(cartoes[1].querySelector('a')).not.toBeInTheDocument()
    expect(cartoes[1]).toHaveTextContent('Provedor')
    expect(container).not.toHaveTextContent('|')
  })

  it('[!COMPARATIVO] vira duas colunas, cada uma com título e lista', () => {
    const corpo = [
      '> [!COMPARATIVO]',
      '> **Aviso**',
      '> - Regra em vigor.',
      '>',
      '> **Comunicado**',
      '> - Situação temporária.',
      '> - Tem data para sair.',
    ].join('\n')
    const { container } = render(<ConteudoArtigo corpo={corpo} />)

    const colunas = container.querySelectorAll('[data-bloco="comparativo"] > ul > li')
    expect(colunas).toHaveLength(2)
    expect(colunas[0].querySelector('p')).toHaveTextContent('Aviso')
    expect(colunas[1].querySelectorAll('li')).toHaveLength(2)
  })

  it('[!CHECKLIST] marca cada item com o ícone de confirmação', () => {
    const { container } = render(
      <ConteudoArtigo corpo={'> [!CHECKLIST]\n> - Erro não documentado.\n> - Não resolveu.'} />,
    )

    const itens = container.querySelectorAll('[data-bloco="checklist"] li')
    expect(itens).toHaveLength(2)
    expect(itens[0].querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it.each([
    ['cartão sem a barra', '> [!CARTOES]\n> - **Título** sem separador'],
    ['cartão com texto no lugar do link', '> [!CARTOES]\n> - **Título** | texto | sem link'],
    ['comparativo com uma coluna só', '> [!COMPARATIVO]\n> **Aviso**\n> - Regra.'],
    ['checklist sem lista', '> [!CHECKLIST]\n> Só um parágrafo.'],
  ])('%s cai para citação comum com o marcador visível', (_caso, corpo) => {
    const { container } = render(<ConteudoArtigo corpo={corpo} />)

    expect(container.querySelector('blockquote')).toHaveTextContent('[!')
    expect(container.querySelector('[data-bloco]')).not.toBeInTheDocument()
  })

  it('passo com ênfase no meio da frase fica num parágrafo só', () => {
    const { container } = render(
      <ConteudoArtigo corpo={'> [!PASSOS]\n> 1. Abra *Painel → Webhooks → Novo*.'} />,
    )

    const paragrafos = container.querySelectorAll('ol > li p')
    expect(paragrafos).toHaveLength(1)
    expect(paragrafos[0]).toHaveTextContent('Abra Painel → Webhooks → Novo.')
  })

  it('marcador desconhecido e citação sem marcador continuam blockquote com o texto visível', () => {
    const { container } = render(
      <ConteudoArtigo corpo={'> [!XYZ] Texto estranho.\n\nFora.\n\n> Citação comum.'} />,
    )

    const citacoes = container.querySelectorAll('blockquote')
    expect(citacoes).toHaveLength(2)
    expect(citacoes[0]).toHaveTextContent('[!XYZ] Texto estranho.')
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('[!PASSOS] vira cartões numerados, com a imagem dentro do cartão do passo', () => {
    const corpo = [
      '> [!PASSOS]',
      '> 1. Abra o painel.',
      '>    ![Painel aberto](/imagens/pasta/painel.png "O painel")',
      '> 2. Salve.',
      '>    - detalhe da sublista',
    ].join('\n')
    const { container } = render(<ConteudoArtigo corpo={corpo} />)

    const passos = container.querySelectorAll('ol > li')
    expect(passos).toHaveLength(2)
    expect(passos[0]).toHaveTextContent(/^1\s*Abra o painel\./)
    expect(passos[0].querySelector('figure img')).toHaveAttribute(
      'src',
      '/imagens/pasta/painel.png',
    )
    expect(passos[1].querySelector('ul li')).toHaveTextContent('detalhe da sublista')
    expect(container).not.toHaveTextContent('[!PASSOS]')
  })

  it('[!DETALHES] vira <details> fechado, com o título no <summary> e a tabela dentro', () => {
    const corpo = '> [!DETALHES] Tabela completa\n>\n> | A | B |\n> | - | - |\n> | 1 | 2 |'
    const { container } = render(<ConteudoArtigo corpo={corpo} />)

    const detalhes = container.querySelector('details')
    expect(detalhes).not.toHaveAttribute('open')
    expect(detalhes?.querySelector('summary')).toHaveTextContent('Tabela completa')
    expect(detalhes?.querySelector('table')).toBeInTheDocument()
  })

  it('bloco ```fluxo vira lista ordenada de etapas, e o texto nunca é interpretado como HTML', () => {
    const corpo = '```fluxo\nEnvio: transmite o <b>RPS</b>\nRetorno\n```'
    const { container } = render(<ConteudoArtigo corpo={corpo} />)

    const etapas = screen.getByRole('list', { name: 'Fluxo' }).querySelectorAll(':scope > li')
    expect(etapas).toHaveLength(2)
    expect(etapas[0]).toHaveTextContent('Envio')
    expect(etapas[0]).toHaveTextContent('transmite o <b>RPS</b>')
    expect(container.querySelector('b')).not.toBeInTheDocument()
    expect(container.querySelector('pre')).not.toBeInTheDocument()
  })

  it('outro bloco de código continua <pre>', () => {
    const { container } = render(<ConteudoArtigo corpo={'```xml\n<Rps/>\n```'} />)

    expect(container.querySelector('pre')).toHaveTextContent('<Rps/>')
  })

  it('imagem de /imagens/ vira <figure> com img lazy e legenda do título; sem título, do alt', () => {
    const corpo =
      '![Tela de login](/imagens/a/login.png "Login do painel")\n\n![Só o alt](/imagens/a/b.png)'
    const { container } = render(<ConteudoArtigo corpo={corpo} />)

    const figuras = container.querySelectorAll('figure')
    expect(figuras).toHaveLength(2)
    expect(figuras[0].parentElement?.tagName).not.toBe('P')
    expect(figuras[0].querySelector('img')).toHaveAttribute('alt', 'Tela de login')
    expect(figuras[0].querySelector('img')).toHaveAttribute('loading', 'lazy')
    expect(figuras[0].querySelector('figcaption')).toHaveTextContent('Login do painel')
    expect(figuras[1].querySelector('figcaption')).toHaveTextContent('Só o alt')
  })

  it('o botão da imagem abre o modal; Esc fecha e devolve o foco ao botão', async () => {
    const usuario = userEvent.setup()
    render(<ConteudoArtigo corpo={'![Tela de login](/imagens/a/login.png "Login")'} />)

    const botao = screen.getByRole('button', { name: 'Ampliar imagem: Login' })
    await usuario.click(botao)

    const dialogo = screen.getByRole('dialog', { name: 'Login' })
    expect(dialogo.querySelector('img')).toHaveAttribute('alt', 'Tela de login')

    await usuario.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(botao).toHaveFocus()
  })

  it('célula exatamente "Sim" ou "Não" ganha ícone decorativo e mantém o texto', () => {
    const corpo =
      '| Campo | Obrigatório |\n| - | - |\n| CNPJ | Sim |\n| CPF | Não |\n| IE | Sim, se houver |'
    const { container } = render(<ConteudoArtigo corpo={corpo} />)

    const celulas = container.querySelectorAll('td')
    expect(celulas[1]).toHaveTextContent('Sim')
    expect(celulas[1].querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(celulas[3]).toHaveTextContent('Não')
    expect(celulas[3].querySelector('svg')).toBeInTheDocument()
    expect(celulas[5].querySelector('svg')).not.toBeInTheDocument()
  })
})

describe('ConteudoArtigo: nada alarga a página em tela estreita', () => {
  it('tabela fica numa região rolável, focável e nomeada pelo cabeçalho', () => {
    render(<ConteudoArtigo corpo={'| Parâmetro | O que é |\n| - | - |\n| Url | Endereço |'} />)

    const regiao = screen.getByRole('region', { name: 'Tabela: Parâmetro, O que é' })
    expect(regiao).toHaveClass('overflow-x-auto')
    expect(regiao).toHaveAttribute('tabindex', '0')
    expect(regiao.querySelector('table')).toBeInTheDocument()
  })

  it('o corpo encolhe abaixo da largura da tabela e quebra link longo, sem depender de quem usa', () => {
    const { container } = render(<ConteudoArtigo corpo="[link](https://exemplo.com/a)" />)

    const corpo = container.firstElementChild
    expect(corpo).toHaveClass('min-w-0')
    expect(corpo).toHaveClass('[&_a]:[overflow-wrap:anywhere]')
  })
})

describe('ConteudoArtigo: a fonte vai para o rodapé', () => {
  it('citação "Fonte:" no topo sai do início e fecha o corpo, com o link preservado', () => {
    const corpo =
      '> Fonte: [Webhook - Configurações](https://exemplo.com/webhook) (12/08/2026).\n\n## Resumo\n\nO Webhook avisa o ERP.'
    const { container } = render(<ConteudoArtigo corpo={corpo} />)

    const corpoRenderizado = container.firstElementChild!
    expect(corpoRenderizado.firstElementChild).toHaveTextContent('Resumo')
    const rodape = corpoRenderizado.lastElementChild!
    expect(rodape.tagName).toBe('FOOTER')
    expect(rodape).toHaveTextContent('Fonte: Webhook - Configurações (12/08/2026).')
    expect(screen.getByRole('link', { name: 'Webhook - Configurações' })).toHaveAttribute(
      'href',
      'https://exemplo.com/webhook',
    )
  })

  it('parágrafo "Fontes:" no meio também vai para o rodapé, junto da citação', () => {
    const corpo =
      '> Fonte: página A.\n\nTexto do meio.\n\nFontes: observações do padrão.\n\n## Fim\n\nÚltimo.'
    const { container } = render(<ConteudoArtigo corpo={corpo} />)

    const rodapes = container.querySelectorAll('footer')
    expect(rodapes).toHaveLength(1)
    expect(rodapes[0].querySelectorAll('p')).toHaveLength(2)
    expect(container.firstElementChild!.lastElementChild).toBe(rodapes[0])
  })

  it('citação comum e caixa [!DICA] não viram fonte', () => {
    const { container } = render(
      <ConteudoArtigo
        corpo={'> Citação sobre a fonte da regra.\n\n> [!DICA] Fonte: veja abaixo.'}
      />,
    )

    expect(container.querySelector('footer')).not.toBeInTheDocument()
  })
})

describe('ConteudoArtigo: tabela de rótulos legível', () => {
  it('primeira coluna de rótulos curtos não quebra linha', () => {
    const corpo =
      '| Notificação | Quando dispara |\n| - | - |\n| **Evento e Documento Inutilizado** | Mudança entre status finais. |'
    render(<ConteudoArtigo corpo={corpo} />)

    expect(screen.getByRole('table')).toHaveClass('[&_td:first-child]:whitespace-nowrap')
  })

  it('primeira coluna com texto longo continua quebrando', () => {
    const longo = 'Um rótulo bem comprido que descreve a situação em detalhe'
    render(<ConteudoArtigo corpo={`| Situação | Ação |\n| - | - |\n| ${longo} | Corrigir. |`} />)

    expect(screen.getByRole('table')).not.toHaveClass('[&_td:first-child]:whitespace-nowrap')
  })
})
