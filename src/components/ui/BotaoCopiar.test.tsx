import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BotaoCopiar } from './BotaoCopiar'

// `userEvent.setup()` já stuba `navigator.clipboard` (Clipboard própria, com
// `writeText`) para emular copiar/colar — sobrescrever a propriedade antes
// (`Object.defineProperty`) não sobrevive à chamada de `setup()`, que
// substitui `navigator.clipboard` de novo. Por isso espionamos o método já
// existente, sempre depois de `setup()`.
function configurarUsuarioComClipboard() {
  const usuario = userEvent.setup()
  const escreverNaAreaDeTransferencia = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue(undefined)
  return { usuario, escreverNaAreaDeTransferencia }
}

describe('BotaoCopiar', () => {
  it('copia o valor certo quando `valor` é string', async () => {
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    render(
      <BotaoCopiar valor="RPS-2026-0001" ariaLabel="Copiar link do verbete RPS" rotulo="Copiar" />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Copiar link do verbete RPS' }))

    expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith('RPS-2026-0001')
  })

  it('copia o valor certo quando `valor` é função', async () => {
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    const obterValor = () => 'https://codex.migrate.info/erros/rps-invalido'

    render(<BotaoCopiar valor={obterValor} ariaLabel="Copiar link do erro" rotulo="Copiar link" />)

    await usuario.click(screen.getByRole('button', { name: 'Copiar link do erro' }))

    expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith(
      'https://codex.migrate.info/erros/rps-invalido',
    )
  })

  it('usa o aria-label específico informado — nunca "Copiar" genérico', () => {
    render(<BotaoCopiar valor="x" ariaLabel="Copiar link do verbete RPS" rotulo="Copiar" />)

    expect(screen.getByRole('button', { name: 'Copiar link do verbete RPS' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copiar' })).not.toBeInTheDocument()
  })

  it('mostra o estado "copiado" após o clique e ele some depois de 2s', async () => {
    const { usuario } = configurarUsuarioComClipboard()
    render(<BotaoCopiar valor="x" ariaLabel="Copiar valor de teste" rotulo="Copiar" />)

    await usuario.click(screen.getByRole('button', { name: 'Copiar valor de teste' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Copiado')

    await waitFor(
      () => {
        expect(screen.getByRole('status')).toHaveTextContent('')
      },
      { timeout: 3000 },
    )
  }, 6000)
})

/**
 * O modo compacto existe para tabela densa: dois botões rotulados por linha competem com o
 * conteúdo. O rótulo não some — muda de lugar.
 */
describe('BotaoCopiar — modo compacto', () => {
  it('mantém o rótulo no documento, como dica', () => {
    render(
      <BotaoCopiar
        compacto
        valor="x"
        ariaLabel="Copiar caminho no XML do campo Razão social"
        rotulo="Copiar caminho"
      />,
    )

    expect(screen.getByText('Copiar caminho')).toBeInTheDocument()
  })

  it('continua anunciando a ação específica ao leitor de tela', () => {
    render(
      <BotaoCopiar
        compacto
        valor="x"
        ariaLabel="Copiar caminho no XML do campo Razão social"
        rotulo="Copiar caminho"
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Copiar caminho no XML do campo Razão social' }),
    ).toBeInTheDocument()
  })

  /**
   * Duas ações de cópia lado a lado precisam de ícones distintos: sem isso, "copiar caminho" e
   * "copiar link" ficam idênticos quando o rótulo sai da tela.
   */
  it('usa ícones distintos para caminho e para link', () => {
    const { container: comCopia } = render(
      <BotaoCopiar compacto icone="copiar" valor="x" ariaLabel="Copiar caminho" rotulo="Caminho" />,
    )
    const { container: comLink } = render(
      <BotaoCopiar compacto icone="link" valor="x" ariaLabel="Copiar link" rotulo="Link" />,
    )

    const classeDoIcone = (raiz: HTMLElement) => raiz.querySelector('svg')?.getAttribute('class')

    expect(classeDoIcone(comCopia)).not.toBe(classeDoIcone(comLink))
  })

  /**
   * O botão compacto fica na última coluna das tabelas. Dica centralizada passava da borda direita
   * e, mesmo transparente, dava barra de rolagem horizontal à tabela. jsdom não faz layout, então a
   * guarda é a ancoragem: pela direita do botão, a dica só cresce para dentro da tabela.
   */
  it('ancora a dica pela direita, para ela não passar da borda da tabela', () => {
    render(
      <BotaoCopiar compacto icone="link" valor="x" ariaLabel="Copiar link" rotulo="Copiar link" />,
    )

    const dica = screen.getByText('Copiar link')
    expect(dica).toHaveClass('right-0')
    expect(dica.className).not.toMatch(/left-1\/2|translate-x/)
  })
})

/**
 * Guarda estrutural: dica que aparece só no hover deixa teclado e toque sem saber o que o botão
 * faz. Foi a razão de o modo compacto não virar o padrão — e é o tipo de detalhe que some numa
 * "simplificação" de classes, sem nada acusar, porque jsdom não computa pseudo-classe.
 */
describe('nenhuma dica aparece só no hover', () => {
  const FONTES = import.meta.glob('../**/*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>

  function arquivosDeProducao(): string[] {
    return Object.keys(FONTES).filter((caminho) => !caminho.endsWith('.test.tsx'))
  }

  it('a varredura enxerga os componentes', () => {
    // Sem contar o universo, um glob que parasse de casar deixaria o caso abaixo passar por vazio.
    expect(arquivosDeProducao().length).toBeGreaterThanOrEqual(20)
  })

  it('toda revelação por group-hover tem a contraparte de foco', () => {
    const semFoco = arquivosDeProducao().filter((caminho) => {
      const fonte = FONTES[caminho]
      return (
        fonte.includes('group-hover:opacity-100') &&
        !fonte.includes('group-focus-visible:opacity-100')
      )
    })

    expect(semFoco).toEqual([])
  })
})

/**
 * Guarda estrutural: no portal público, copiar link é sempre só o ícone de elo, com o rótulo
 * virando dica. Padrão decidido para todo o portal; um botão novo com texto passaria despercebido
 * página a página. A área interna fica de fora: na busca dela o rótulo distingue link público de
 * link interno, e isso é informação.
 */
describe('copiar link no portal público é só o ícone', () => {
  const FONTES = import.meta.glob('../../**/*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>

  function botoesDeCopiarLink(): { arquivo: string; bloco: string }[] {
    return Object.entries(FONTES)
      .filter(([arquivo]) => !arquivo.endsWith('.test.tsx') && !arquivo.includes('/interno/'))
      .flatMap(([arquivo, fonte]) =>
        (fonte.match(/<BotaoCopiar[\s\S]*?\/>/g) ?? [])
          .filter((bloco) => /ariaLabel=\{?[`"]Copiar link/.test(bloco))
          .map((bloco) => ({ arquivo, bloco })),
      )
  }

  it('a varredura enxerga os botões de copiar link', () => {
    // Artigo, erro, exemplos, avisos e modal do campo.
    expect(botoesDeCopiarLink().length).toBeGreaterThanOrEqual(5)
  })

  it('o modal do campo — o único copiar-link do dicionário do layout e da tabela do provedor — está na varredura', () => {
    const arquivos = botoesDeCopiarLink().map(({ arquivo }) => arquivo)

    expect(arquivos.some((arquivo) => arquivo.endsWith('/ModalDeCampoNavegavel.tsx'))).toBe(true)
  })

  it('todo botão de copiar link é compacto, com o ícone de elo', () => {
    const comTexto = botoesDeCopiarLink()
      .filter(({ bloco }) => !/\bcompacto\b/.test(bloco) || !bloco.includes('icone="link"'))
      .map(({ arquivo }) => arquivo)

    expect(comTexto).toEqual([])
  })
})
