import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LinhaDoCampo } from './LinhaDoCampo'

/**
 * Registros copiados da resposta da API (Emissor Nacional 0.20). A fixture não é anotada com o tipo
 * do cliente: quem confere o formato é o componente. Onde a API ainda não traz o caso (exemplo
 * preenchido, destino ausente, destino omitido) o registro real foi alterado só naquele campo.
 */
const CAMPO_DOIS_DESTINOS_E_TRES_REJEICOES = {
  campoLayoutSlug: 'servico-paipreservico',
  reformaTributaria: false,
  nome: 'PaiPreServico',
  caminhoXml: '//Servico/PaiPreServico',
  significado: 'País de prestação do serviço.',
  tipo: 'Texto',
  tamanho: '2',
  mascara: null,
  dominio: null,
  estadoPreenchimento: 'Condicional' as const,
  condicao: 'Informar apenas um entre: cLocPrestacao, cPaisPrestacao.',
  exemplo: null,
  notaPreenchimento: null,
  destinoXml:
    'DPS/infDPS/serv/locPrest/cPaisPrestacao | DPS/infDPS/valores/trib/tribMun/cPaisResult',
  notaTransformacao: 'O InvoiCy grava este campo em 2 tags da DPS.',
  ordem: 150,
  errosConhecidos: [
    { slug: 'e0304-informe-um-codigo-de-pais-existente', codigo: 'E0304' },
    { slug: 'e0590-e-obrigatorio-informar-o-codigo-do-pais', codigo: 'E0590' },
    { slug: 'e0591-nao-e-permitido-informar-o-codigo-do-pais', codigo: 'E0591' },
  ],
}

const CAMPO_SEM_TAMANHO_SEM_REJEICAO = {
  campoLayoutSlug: 'demis',
  reformaTributaria: false,
  nome: 'dEmis',
  caminhoXml: '//dEmis',
  significado: 'Data de emissão.',
  tipo: 'Data e hora',
  tamanho: null,
  mascara: 'AAAA-MM-DDThh:mm:ssTZD (UTC)',
  dominio: null,
  estadoPreenchimento: 'Obrigatorio' as const,
  condicao: null,
  exemplo: null,
  notaPreenchimento: null,
  destinoXml: 'DPS/infDPS/dhEmi',
  notaTransformacao: null,
  ordem: 12,
  errosConhecidos: [],
}

const CAMPO_SEM_DESTINO_COM_EXEMPLO = {
  ...CAMPO_SEM_TAMANHO_SEM_REJEICAO,
  campoLayoutSlug: 'natop',
  reformaTributaria: false,
  nome: 'natOp',
  caminhoXml: '//natOp',
  tipo: 'Numérico',
  tamanho: '1',
  estadoPreenchimento: 'Opcional' as const,
  exemplo: '1',
  destinoXml: null,
}

const CAMPO_COM_DESTINO_OMITIDO = {
  ...CAMPO_SEM_TAMANHO_SEM_REJEICAO,
  campoLayoutSlug: 'tomador-tomacep',
  reformaTributaria: false,
  nome: 'TomaCEP',
  caminhoXml: '//Tomador/TomaCEP',
  destinoXml: 'DPS/infDPS/toma/end/endNac/CEP | …',
}

function renderizarLinha(
  campo: Parameters<typeof LinhaDoCampo>[0]['campo'],
  { ativo = false, onAbrir = vi.fn() } = {},
) {
  const resultado = render(
    <table>
      <tbody>
        <LinhaDoCampo campo={campo} ativo={ativo} onAbrir={onAbrir} />
      </tbody>
    </table>,
  )

  const linha = resultado.container.querySelector('tr')!
  const celula = (coluna: string) =>
    linha.querySelector<HTMLElement>(`[data-coluna="${coluna}"]`) as HTMLElement

  return { ...resultado, linha, celula, onAbrir }
}

describe('LinhaDoCampo — células', () => {
  it('mostra nome, estado, tag, tipo e exemplo em suas colunas, sem coluna de tamanho', () => {
    const { linha, celula } = renderizarLinha(CAMPO_SEM_DESTINO_COM_EXEMPLO)
    const comDestino = renderizarLinha(CAMPO_SEM_TAMANHO_SEM_REJEICAO)

    expect(linha.id).toBe('campo-natop')
    expect(within(celula('campo')).getByRole('button', { name: 'natOp' })).toBeInTheDocument()
    expect(celula('campo')).toHaveTextContent('Opcional')
    expect(celula('tipo')).toHaveTextContent('Numérico')
    expect(linha.querySelector('[data-coluna="tamanho"]')).toBeNull()
    expect(celula('exemplo')).toHaveTextContent('1')
    expect(comDestino.celula('tag')).toHaveTextContent('dhEmi')
  })

  it('o botão do nome carrega o caminho no Layout InvoiCy como dica', () => {
    const { celula } = renderizarLinha(CAMPO_SEM_DESTINO_COM_EXEMPLO)

    expect(within(celula('campo')).getByRole('button', { name: 'natOp' })).toHaveAttribute(
      'title',
      '//natOp',
    )
  })

  it('o uso do campo vem escrito por extenso na coluna Uso e, em tela estreita, na linha do nome', () => {
    const { celula } = renderizarLinha(CAMPO_DOIS_DESTINOS_E_TRES_REJEICOES)

    const etiqueta = celula('campo').querySelector('[data-obrigatoriedade]')!
    const botao = within(celula('campo')).getByRole('button', { name: 'PaiPreServico' })

    expect(etiqueta).toHaveTextContent('Condicional')
    expect(etiqueta).not.toHaveClass('sr-only')
    expect(etiqueta.parentElement).toBe(botao.parentElement)
    expect(celula('uso')).toHaveTextContent('Condicional')
  })

  it('exemplo ausente deixa a célula vazia, sem traço nem "sem exemplo"', () => {
    const { celula } = renderizarLinha(CAMPO_SEM_TAMANHO_SEM_REJEICAO)

    expect(celula('exemplo').textContent).toBe('')
  })

  it('destino ausente fica vazio na tela, com o motivo só para leitor de tela', () => {
    const { celula } = renderizarLinha(CAMPO_SEM_DESTINO_COM_EXEMPLO)

    expect(celula('tag').textContent).toBe('sem destino no XML do provedor')
    expect(within(celula('tag')).getByText('sem destino no XML do provedor')).toHaveClass('sr-only')
    expect(celula('tag').querySelector('[title]')).toBeNull()
  })

  it('sem exemplo na versão, a linha não tem a célula de exemplo', () => {
    render(
      <table>
        <tbody>
          <LinhaDoCampo
            campo={CAMPO_SEM_TAMANHO_SEM_REJEICAO}
            ativo={false}
            mostrarExemplo={false}
            onAbrir={vi.fn()}
          />
        </tbody>
      </table>,
    )

    expect(document.querySelector('[data-coluna="exemplo"]')).toBeNull()
    expect(document.querySelectorAll('td')).toHaveLength(5)
  })

  it('o exemplo preenchido traz o valor inteiro como dica', () => {
    const { celula } = renderizarLinha(CAMPO_SEM_DESTINO_COM_EXEMPLO)

    expect(celula('exemplo').querySelector('[title]')).toHaveAttribute('title', '1')
  })

  it('o resumo móvel junta tipo e exemplo, na célula do campo', () => {
    const { celula } = renderizarLinha(CAMPO_SEM_DESTINO_COM_EXEMPLO)

    expect(celula('campo').querySelector('[data-resumo-movel]')?.textContent).toBe(
      'Numérico · ex.: 1',
    )
  })
})

describe('LinhaDoCampo — destinos no XML do provedor', () => {
  it('dois destinos viram dois nomes de tag, cada um com o caminho completo como dica', () => {
    const { celula } = renderizarLinha(CAMPO_DOIS_DESTINOS_E_TRES_REJEICOES)

    const nomes = Array.from(celula('tag').querySelectorAll('[title]'))

    expect(nomes.map((nome) => nome.textContent)).toEqual(['cPaisPrestacao', 'cPaisResult'])
    expect(nomes.map((nome) => nome.getAttribute('title'))).toEqual([
      'DPS/infDPS/serv/locPrest/cPaisPrestacao',
      'DPS/infDPS/valores/trib/tribMun/cPaisResult',
    ])
  })

  it('destino omitido mostra "e mais destinos" e nunca uma tag chamada "…"', () => {
    const { celula } = renderizarLinha(CAMPO_COM_DESTINO_OMITIDO)

    expect(celula('tag')).toHaveTextContent('e mais destinos')
    expect(celula('tag')).not.toHaveTextContent('…')
    expect(Array.from(celula('tag').querySelectorAll('[title]')).map((n) => n.textContent)).toEqual(
      ['CEP'],
    )
  })
})

describe('LinhaDoCampo — botões', () => {
  it('sem rejeição, a linha tem exatamente um botão: o do nome', () => {
    const { linha } = renderizarLinha(CAMPO_SEM_TAMANHO_SEM_REJEICAO)

    expect(within(linha).getAllByRole('button')).toHaveLength(1)
  })

  it('com rejeição, tem dois botões e o contador fica fora do botão do nome', () => {
    const { linha } = renderizarLinha(CAMPO_DOIS_DESTINOS_E_TRES_REJEICOES)

    const botoes = within(linha).getAllByRole('button')
    const botaoDoNome = within(linha).getByRole('button', { name: 'PaiPreServico' })
    const contador = within(linha).getByRole('button', {
      name: 'Ver as 3 rejeições registradas no campo PaiPreServico',
    })

    expect(botoes).toHaveLength(2)
    expect(botaoDoNome.contains(contador)).toBe(false)
  })

  it('clicar no botão do nome abre o campo uma vez, sem seção', () => {
    const { onAbrir } = renderizarLinha(CAMPO_DOIS_DESTINOS_E_TRES_REJEICOES)

    fireEvent.click(screen.getByRole('button', { name: 'PaiPreServico' }))

    expect(onAbrir).toHaveBeenCalledExactlyOnceWith('servico-paipreservico')
  })

  it('clicar na linha, fora de botão, abre o campo uma vez', () => {
    const { celula, onAbrir } = renderizarLinha(CAMPO_DOIS_DESTINOS_E_TRES_REJEICOES)

    fireEvent.click(celula('tipo'))

    expect(onAbrir).toHaveBeenCalledExactlyOnceWith('servico-paipreservico')
  })

  it('clicar no contador abre o campo uma vez, na seção de rejeições', () => {
    const { onAbrir } = renderizarLinha(CAMPO_DOIS_DESTINOS_E_TRES_REJEICOES)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Ver as 3 rejeições registradas no campo PaiPreServico',
      }),
    )

    expect(onAbrir).toHaveBeenCalledExactlyOnceWith('servico-paipreservico', 'rejeicoes')
  })
})

describe('LinhaDoCampo — campo ativo', () => {
  it('marca o botão do nome com aria-current e o filete na primeira célula visível', () => {
    const { celula, linha } = renderizarLinha(CAMPO_SEM_TAMANHO_SEM_REJEICAO, { ativo: true })

    expect(screen.getByRole('button', { name: 'dEmis' })).toHaveAttribute('aria-current', 'true')
    // No desktop a primeira célula é a do uso; em tela estreita ela some e o filete vai ao nome.
    expect(celula('uso')).toHaveClass('border-l-accent')
    expect(celula('campo')).toHaveClass('max-[859px]:border-l-accent')
    expect(linha).toHaveClass('bg-highlight-anchor')
  })

  it('sem ativo, não marca nada e mantém o filete transparente (a linha não pula)', () => {
    const { celula, linha } = renderizarLinha(CAMPO_SEM_TAMANHO_SEM_REJEICAO)

    expect(screen.getByRole('button', { name: 'dEmis' })).not.toHaveAttribute('aria-current')
    expect(celula('uso')).toHaveClass('border-l-[3px]', 'border-l-transparent')
    expect(celula('uso')).not.toHaveClass('border-l-accent')
    expect(celula('campo')).toHaveClass('max-[859px]:border-l-transparent')
    expect(linha).not.toHaveClass('bg-highlight-anchor')
  })
})
