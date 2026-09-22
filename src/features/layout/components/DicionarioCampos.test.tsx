import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { GrupoCamposLayout } from '../types/layoutPublico'
import { DicionarioCampos } from './DicionarioCampos'

// Ordem de chegada deliberadamente diferente da alfabética E do inverso dela:
// uma ordenação acidental no cliente (crescente ou decrescente) muda esta
// sequência e derruba o teste. Duas linhas passariam por acidente.
const camposPorGrupo: GrupoCamposLayout[] = [
  {
    grupo: 'Identificação',
    grupoSlug: 'identificacao',
    campos: [
      {
        slug: 'competencia',
        nome: 'Competência',
        caminhoXml: 'Nfse/Rps/Competencia',
        significado: 'Mês a que o serviço se refere.',
        ordem: 1,
        novoNestaVersao: false,
        descontinuadoNestaVersao: false,
        // Deliberadamente diferente de `/layout/campos/{slug}`: se o
        // componente montar o caminho à mão, o valor copiado muda e o teste
        // cai (A3 — `urlCanonica` é a fonte única).
        urlCanonica: '/layout/campos/competencia-canonico',
      },
      {
        slug: 'numero-do-rps',
        nome: 'Número do RPS',
        caminhoXml: 'Nfse/Rps/IdentificacaoRps/Numero',
        significado: 'Numeração sequencial do recibo.',
        ordem: 2,
        novoNestaVersao: true,
        descontinuadoNestaVersao: false,
        urlCanonica: '/layout/campos/numero-do-rps-canonico',
      },
      {
        slug: 'anexo-antigo',
        nome: 'Anexo antigo',
        caminhoXml: 'Nfse/Rps/AnexoAntigo',
        significado: 'Bloco removido do vocabulário.',
        ordem: 3,
        novoNestaVersao: false,
        descontinuadoNestaVersao: true,
        urlCanonica: '/layout/campos/anexo-antigo-canonico',
      },
    ],
  },
]

function renderDicionario(grupos: GrupoCamposLayout[] = camposPorGrupo) {
  return render(
    <DicionarioCampos
      versaoRotulo="4.13"
      totalCampos={grupos.reduce((soma, grupo) => soma + grupo.campos.length, 0)}
      camposPorGrupo={grupos}
      origemUrl="https://codex.migrate.info"
    />,
  )
}

function nomesDasLinhas(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1) // pula o cabeçalho
    .map((linha) => within(linha).getAllByRole('cell')[0]!.textContent ?? '')
}

function configurarUsuarioComClipboard() {
  const usuario = userEvent.setup()
  const escreverNaAreaDeTransferencia = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue(undefined)
  return { usuario, escreverNaAreaDeTransferencia }
}

describe('DicionarioCampos', () => {
  it('mantém a ordem dos campos devolvida pelo backend', () => {
    renderDicionario()

    const nomes = nomesDasLinhas()
    expect(nomes[0]).toContain('Competência')
    expect(nomes[1]).toContain('Número do RPS')
    expect(nomes[2]).toContain('Anexo antigo')
  })

  it('filtra por nome do campo', async () => {
    const usuario = userEvent.setup()
    renderDicionario()

    await usuario.type(screen.getByLabelText(/Filtrar por nome/i), 'Competência')

    expect(screen.getByText('Competência')).toBeInTheDocument()
    expect(screen.queryByText('Número do RPS')).not.toBeInTheDocument()
  })

  it('filtra por caminho no layout', async () => {
    const usuario = userEvent.setup()
    renderDicionario()

    await usuario.type(screen.getByLabelText(/Filtrar por nome/i), 'IdentificacaoRps')

    expect(screen.getByText('Número do RPS')).toBeInTheDocument()
    expect(screen.queryByText('Competência')).not.toBeInTheDocument()
  })

  it('filtra por significado — a coluna que a tabela do provedor não tem', async () => {
    const usuario = userEvent.setup()
    renderDicionario()

    await usuario.type(screen.getByLabelText(/Filtrar por nome/i), 'removido do vocabulário')

    expect(screen.getByText('Anexo antigo')).toBeInTheDocument()
    expect(screen.queryByText('Competência')).not.toBeInTheDocument()
  })

  it('a contagem muda de texto com o filtro, e o filtro nunca vira consulta ao servidor', async () => {
    const usuario = userEvent.setup()
    renderDicionario()

    expect(screen.getByText('3 campos no vocabulário da 4.13.')).toBeInTheDocument()

    await usuario.type(screen.getByLabelText(/Filtrar por nome/i), 'Competência')

    expect(screen.getByText('Mostrando 1 de 3 campos.')).toBeInTheDocument()
  })

  it('filtro sem resultado mostra estado vazio com ação de limpar, e limpar devolve tudo', async () => {
    const usuario = userEvent.setup()
    renderDicionario()

    await usuario.type(screen.getByLabelText(/Filtrar por nome/i), 'zzz-inexistente')

    expect(
      screen.getByText('Nenhum campo da 4.13 corresponde a “zzz-inexistente”.'),
    ).toBeInTheDocument()

    await usuario.click(screen.getAllByRole('button', { name: 'Limpar filtro' })[0]!)

    expect(nomesDasLinhas()).toHaveLength(3)
  })

  it('a pílula "novo na versão" aparece só no campo que nasceu nesta versão', () => {
    renderDicionario()

    const pilulas = screen.getAllByText('novo na 4.13')
    expect(pilulas).toHaveLength(1)
    expect(screen.getByRole('row', { name: /Número do RPS/ })).toContainElement(pilulas[0]!)
  })

  it('campo descontinuado carrega o TEXTO, nunca só o estilo', () => {
    renderDicionario()

    const textos = screen.getAllByText('Descontinuado nesta versão')
    expect(textos).toHaveLength(1)
    expect(screen.getByRole('row', { name: /Anexo antigo/ })).toContainElement(textos[0]!)
  })

  it('o link copiado vem de `urlCanonica`, nunca de um caminho montado à mão', async () => {
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    renderDicionario()

    await usuario.click(
      screen.getByRole('button', { name: 'Copiar link do verbete Número do RPS' }),
    )

    expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith(
      'https://codex.migrate.info/layout/campos/numero-do-rps-canonico',
    )
  })

  it('dicionário sem nenhum campo publicado mostra estado vazio nomeado, não tabela em branco', () => {
    renderDicionario([])

    expect(screen.getByText('A 4.13 ainda não tem campos publicados.')).toBeInTheDocument()
    expect(screen.queryByRole('row')).not.toBeInTheDocument()
  })

  it('não expõe nenhuma coluna de comportamento (R3 — vocabulário, não comportamento)', () => {
    renderDicionario()

    for (const rotuloProibido of ['Tipo', 'Tamanho', 'Máscara', 'Obrigatoriedade']) {
      expect(screen.queryByRole('columnheader', { name: rotuloProibido })).not.toBeInTheDocument()
    }
  })
})
