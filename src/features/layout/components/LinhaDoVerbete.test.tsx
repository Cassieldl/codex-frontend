import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LinhaDoVerbete } from './LinhaDoVerbete'
import type { LinhaDoVerbeteProps } from './LinhaDoVerbete'

// Slug diferente do nome: o callback recebe o identificador, não o rótulo exibido.
const CAMPO_ATIVO_NA_VERSAO = {
  slug: 'servico-valores-valservicos',
  nome: 'ValServicos',
  caminhoXml: '//Servico/Valores/ValServicos',
  significado: 'Valor dos serviços.',
  ordem: 160,
  reformaTributaria: false,
  novoNestaVersao: false,
  descontinuadoNestaVersao: false,
  urlCanonica: '/layout/campos/servico-valores-valservicos',
}

const CAMPO_NOVO = { ...CAMPO_ATIVO_NA_VERSAO, novoNestaVersao: true }

const CAMPO_DESCONTINUADO = {
  ...CAMPO_ATIVO_NA_VERSAO,
  slug: 'servico-anexo-antigo',
  nome: 'AnexoAntigo',
  caminhoXml: '//Servico/AnexoAntigo',
  significado: 'Bloco removido do vocabulário.',
  descontinuadoNestaVersao: true,
}

const SIGNIFICADO_LONGO =
  'Valor total dos serviços prestados, antes de qualquer dedução ou retenção. ' +
  'Corresponde ao valor bruto da nota e é a base de cálculo do imposto municipal, ' +
  'conforme a legislação do município de prestação.'

function renderizarLinha(sobrescritas: Partial<LinhaDoVerbeteProps> = {}) {
  const onAbrir = vi.fn()

  const resultado = render(
    <table>
      <tbody>
        <LinhaDoVerbete
          campo={CAMPO_ATIVO_NA_VERSAO}
          versaoRotulo="4.13"
          ativo={false}
          onAbrir={onAbrir}
          {...sobrescritas}
        />
      </tbody>
    </table>,
  )

  return { ...resultado, onAbrir, linha: screen.getByRole('row') }
}

describe('LinhaDoVerbete', () => {
  it('tem exatamente um botão: o do nome (copiar mora no modal)', () => {
    const { linha } = renderizarLinha()

    const botoes = within(linha).getAllByRole('button')

    expect(botoes).toHaveLength(1)
    expect(botoes[0]).toHaveAccessibleName('ValServicos')
    expect(botoes[0]).toHaveAttribute('data-botao-do-campo')
    expect(botoes[0]).toHaveAttribute('aria-haspopup', 'dialog')
  })

  it('a linha tem o id de âncora do campo, que o hook usa para devolver o foco', () => {
    const { linha } = renderizarLinha()

    expect(linha).toHaveAttribute('id', 'campo-servico-valores-valservicos')
  })

  it('o selo "novo na versão" aparece só no campo que nasceu nesta versão', () => {
    const { unmount } = renderizarLinha({ campo: CAMPO_NOVO })
    expect(screen.getByText('novo na versão 4.13')).toBeInTheDocument()
    unmount()

    renderizarLinha()
    expect(screen.queryByText(/novo na versão/)).toBeNull()
  })

  it('o selo não repete "versão" quando o rótulo do cadastro já a traz', () => {
    renderizarLinha({ campo: CAMPO_NOVO, versaoRotulo: 'Versão 4.13' })

    expect(screen.getByText('novo na versão 4.13')).toBeInTheDocument()
  })

  it('campo descontinuado carrega o texto, nunca só o estilo, e não usa opacidade', () => {
    const { linha } = renderizarLinha({ campo: CAMPO_DESCONTINUADO })

    expect(within(linha).getByText('Descontinuado nesta versão')).toBeInTheDocument()

    const classes = [linha, ...Array.from(linha.querySelectorAll('*'))]
      .map((elemento) => elemento.getAttribute('class') ?? '')
      .join(' ')
    expect(classes).not.toMatch(/(^|\s)opacity-/)
  })

  it('só o campo descontinuado mostra o texto de descontinuação', () => {
    renderizarLinha()

    expect(screen.queryByText('Descontinuado nesta versão')).toBeNull()
  })

  it('o significado é cortado por CSS em duas linhas, mas o texto inteiro está no DOM', () => {
    const { linha } = renderizarLinha({
      campo: { ...CAMPO_ATIVO_NA_VERSAO, significado: SIGNIFICADO_LONGO },
    })

    const celula = linha.querySelector('[data-coluna="significado"]')!
    const paragrafo = within(celula as HTMLElement).getByText(SIGNIFICADO_LONGO)

    expect(paragrafo).toHaveClass('line-clamp-2')
    expect(paragrafo).toHaveAttribute('title', SIGNIFICADO_LONGO)
  })

  it('clicar na linha, fora do botão, abre o campo', () => {
    const { linha, onAbrir } = renderizarLinha()

    fireEvent.click(linha.querySelector('[data-coluna="significado"]')!)

    expect(onAbrir).toHaveBeenCalledExactlyOnceWith('servico-valores-valservicos')
  })

  it('clicar no botão do nome abre uma única vez, sem o clique da linha repetir', () => {
    const { onAbrir } = renderizarLinha()

    fireEvent.click(screen.getByRole('button', { name: 'ValServicos' }))

    expect(onAbrir).toHaveBeenCalledTimes(1)
    expect(onAbrir).toHaveBeenCalledWith('servico-valores-valservicos')
  })

  it('o botão do nome abre com Enter', async () => {
    const usuario = userEvent.setup()
    const { onAbrir } = renderizarLinha()

    screen.getByRole('button', { name: 'ValServicos' }).focus()
    await usuario.keyboard('{Enter}')

    expect(onAbrir).toHaveBeenCalledTimes(1)
  })

  it('aria-current e o fundo de destaque só aparecem na linha ativa', () => {
    const { unmount } = renderizarLinha({ ativo: true })
    expect(screen.getByRole('button', { name: 'ValServicos' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByRole('row')).toHaveClass('bg-highlight-anchor')
    unmount()

    renderizarLinha({ ativo: false })
    expect(screen.getByRole('button', { name: 'ValServicos' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('row')).not.toHaveClass('bg-highlight-anchor')
  })

  it('o caminho no XML aparece na coluna própria e no resumo do celular', () => {
    const { linha } = renderizarLinha()

    expect(linha.querySelector('[data-coluna="caminho"]')).toHaveTextContent(
      '//Servico/Valores/ValServicos',
    )
    expect(linha.querySelector('[data-resumo-movel]')).toHaveTextContent(
      '//Servico/Valores/ValServicos',
    )
  })
})
