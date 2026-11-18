import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BlocoDeCampos } from './BlocoDeCampos'
import type { BlocoDeCamposProps } from './BlocoDeCampos'

/**
 * Registros do bloco "Serviço" do Emissor Nacional 0.20, no formato que a API devolve. O mesmo
 * nome de campo e de tag (`cClassTrib`) existe em dois subgrupos, com caminhos diferentes; o
 * segundo registro foi acrescentado para isso, porque a API ainda não repete o nome dentro do
 * bloco. O caminho no XML nunca é igual ao destino em nenhum registro.
 */
const DISCRIMINACAO = {
  campoLayoutSlug: 'servico-discriminacao',
  reformaTributaria: false,
  nome: 'Discriminacao',
  caminhoXml: '//Servico/Discriminacao',
  significado: 'Descrição do serviço prestado.',
  tipo: 'Texto',
  tamanho: '1000',
  mascara: null,
  dominio: null,
  estadoPreenchimento: 'Obrigatorio' as const,
  condicao: null,
  exemplo: null,
  notaPreenchimento: null,
  destinoXml: 'DPS/infDPS/serv/cServ/xDescServ',
  notaTransformacao: null,
  ordem: 148,
  errosConhecidos: [],
}

const CLASSE_TRIBUTARIA_NO_IBSCBS = {
  ...DISCRIMINACAO,
  campoLayoutSlug: 'servico-ibscbs-cclasstrib',
  reformaTributaria: false,
  nome: 'cClassTrib',
  caminhoXml: '//Servico/IBSCBS/cClassTrib',
  tipo: 'Numérico',
  tamanho: '6',
  estadoPreenchimento: 'Condicional' as const,
  destinoXml: 'DPS/infDPS/IBSCBS/valores/trib/gIBSCBS/cClassTrib',
  ordem: 301,
  errosConhecidos: [{ slug: 'e0402-classificacao-tributaria-invalida', codigo: 'E0402' }],
}

const CLASSE_TRIBUTARIA_NO_IBS = {
  ...CLASSE_TRIBUTARIA_NO_IBSCBS,
  campoLayoutSlug: 'servico-valores-ibscbs-ibs-cclasstrib',
  reformaTributaria: false,
  caminhoXml: '//Servico/Valores/IBSCBS/IBS/cClassTrib',
  estadoPreenchimento: 'Opcional' as const,
  destinoXml: 'DPS/infDPS/IBSCBS/valores/trib/gIBSCBS/gIBSMun/cClassTrib',
  ordem: 220,
  errosConhecidos: [],
}

const BLOCO_SERVICO = {
  raiz: 'Servico',
  rotulo: 'Serviço',
  totalDoBloco: 3,
  obrigatoriosDoBloco: 1,
  totalVisivel: 3,
  subgrupos: [
    {
      chave: 'servico',
      grupoSlug: 'servico',
      titulo: 'Campos gerais',
      campos: [DISCRIMINACAO],
    },
    {
      chave: 'servico-ibscbs',
      grupoSlug: 'servico-ibscbs',
      titulo: 'IBSCBS',
      campos: [CLASSE_TRIBUTARIA_NO_IBSCBS],
    },
    {
      chave: 'servico-valores-ibscbs-ibs',
      grupoSlug: 'servico-valores-ibscbs-ibs',
      titulo: 'Valores › IBSCBS › IBS',
      campos: [CLASSE_TRIBUTARIA_NO_IBS],
    },
  ],
}

const BLOCO_DE_UM_SUBGRUPO_SEM_SLUG = {
  raiz: 'outros',
  rotulo: 'Outros campos',
  totalDoBloco: 1,
  obrigatoriosDoBloco: 1,
  totalVisivel: 1,
  subgrupos: [{ chave: 'sem-grupo', grupoSlug: null, titulo: null, campos: [DISCRIMINACAO] }],
}

function renderizarBloco(sobrescritas: Partial<BlocoDeCamposProps> = {}) {
  const props: BlocoDeCamposProps = {
    bloco: BLOCO_SERVICO,
    aberto: true,
    filtrando: false,
    slugAtivo: null,
    onAlternar: vi.fn(),
    onAbrirCampo: vi.fn(),
    ...sobrescritas,
  }

  const resultado = render(<BlocoDeCampos {...props} />)
  const detalhes = resultado.container.querySelector('details')!

  return { ...resultado, detalhes, props }
}

describe('BlocoDeCampos — cabeçalho', () => {
  it('mostra o rótulo do bloco e a meta, sem filtro', () => {
    const { detalhes } = renderizarBloco()

    expect(within(detalhes).getByRole('heading', { level: 3, name: 'Serviço' })).toBeInTheDocument()
    expect(detalhes.querySelector('summary')).toHaveTextContent('3 campos · 1 obrigatório')
  })

  it('com filtro, a meta mostra quantos campos aparecem de quantos o bloco tem', () => {
    const { detalhes } = renderizarBloco({
      filtrando: true,
      bloco: { ...BLOCO_SERVICO, totalVisivel: 2 },
    })

    expect(detalhes.querySelector('summary')).toHaveTextContent('2 de 3 campos · 1 obrigatório')
  })

  it('usa o singular para um campo e vários obrigatórios no plural', () => {
    const { detalhes } = renderizarBloco({
      bloco: { ...BLOCO_SERVICO, totalDoBloco: 1, obrigatoriosDoBloco: 2 },
    })

    expect(detalhes.querySelector('summary')).toHaveTextContent('1 campo · 2 obrigatórios')
  })
})

describe('BlocoDeCampos — abertura', () => {
  it('o <details> reflete a prop aberto', () => {
    const aberto = renderizarBloco({ aberto: true })
    expect(aberto.detalhes).toHaveAttribute('open')
    aberto.unmount()

    const fechado = renderizarBloco({ aberto: false })
    expect(fechado.detalhes).not.toHaveAttribute('open')
  })

  it('o id do <details> é bloco-{raiz}, o destino do índice lateral', () => {
    const { detalhes } = renderizarBloco()

    expect(detalhes.id).toBe('bloco-Servico')
  })

  it('avisa o estado novo quando o navegador abre o bloco (Ctrl+F, fragmento)', () => {
    const { detalhes, props } = renderizarBloco({ aberto: false })

    detalhes.open = true
    fireEvent(detalhes, new Event('toggle'))

    expect(props.onAlternar).toHaveBeenLastCalledWith('Servico', true)
  })

  it('avisa o estado novo quando o bloco é fechado', () => {
    const { detalhes, props } = renderizarBloco({ aberto: true })

    detalhes.open = false
    fireEvent(detalhes, new Event('toggle'))

    expect(props.onAlternar).toHaveBeenLastCalledWith('Servico', false)
  })
})

describe('BlocoDeCampos — subgrupos e tabelas', () => {
  it('cada subgrupo com título tem um h4 e uma tabela própria, com legenda de leitor de tela', () => {
    const { detalhes } = renderizarBloco()

    const subtitulos = within(detalhes).getAllByRole('heading', { level: 4 })
    const tabelas = within(detalhes).getAllByRole('table', { hidden: true })

    expect(subtitulos.map((subtitulo) => subtitulo.textContent)).toEqual([
      'Campos gerais',
      'IBSCBS',
      'Valores › IBSCBS › IBS',
    ])
    expect(tabelas).toHaveLength(3)
    expect(tabelas.map((tabela) => tabela.querySelector('caption')?.textContent)).toEqual([
      'Campos de Serviço › Campos gerais',
      'Campos de Serviço › IBSCBS',
      'Campos de Serviço › Valores › IBSCBS › IBS',
    ])
  })

  it('cada tabela tem seis cabeçalhos de coluna, o último para as rejeições', () => {
    const { detalhes } = renderizarBloco()

    for (const tabela of detalhes.querySelectorAll('table')) {
      const cabecalhos = Array.from(tabela.querySelectorAll('thead th'))

      expect(cabecalhos.map((cabecalho) => cabecalho.textContent)).toEqual([
        'Campo InvoiCy',
        'Tag do provedor',
        'Tipo',
        'Tamanho',
        'Exemplo',
        'Rejeições registradas',
      ])
      expect(cabecalhos.every((cabecalho) => cabecalho.getAttribute('scope') === 'col')).toBe(true)
    }
  })

  it('o wrapper de cada subgrupo leva id grupo-{slug}', () => {
    const { detalhes } = renderizarBloco()

    const ids = Array.from(detalhes.querySelectorAll('table')).map(
      (tabela) => tabela.parentElement?.id,
    )

    expect(ids).toEqual([
      'grupo-servico',
      'grupo-servico-ibscbs',
      'grupo-servico-valores-ibscbs-ibs',
    ])
  })

  it('subgrupo sem slug não tem id, e sem título não tem h4', () => {
    const { detalhes } = renderizarBloco({ bloco: BLOCO_DE_UM_SUBGRUPO_SEM_SLUG })

    expect(detalhes.querySelector('table')?.parentElement?.hasAttribute('id')).toBe(false)
    expect(within(detalhes).queryByRole('heading', { level: 4 })).toBeNull()
    expect(detalhes.querySelector('caption')?.textContent).toBe('Campos de Outros campos')
  })

  it('o mesmo nome de tag em dois subgrupos aparece sob subtítulos diferentes', () => {
    const { detalhes } = renderizarBloco()

    const tabelas = Array.from(detalhes.querySelectorAll('table'))
    const comClasseTributaria = tabelas.filter((tabela) =>
      within(tabela).queryByRole('button', { name: 'cClassTrib' }),
    )
    const subtituloDe = (tabela: HTMLTableElement) =>
      tabela.parentElement?.querySelector('h4')?.textContent

    expect(comClasseTributaria).toHaveLength(2)
    expect(comClasseTributaria.map(subtituloDe)).toEqual(['IBSCBS', 'Valores › IBSCBS › IBS'])
  })
})

describe('BlocoDeCampos — colunas', () => {
  it('o colgroup e a linha de rótulos saem da mesma lista de seis colunas', () => {
    const { detalhes } = renderizarBloco()

    const colunas = Array.from(detalhes.querySelector('colgroup')!.querySelectorAll('col'))
    const rotulos = detalhes.querySelector('div[aria-hidden="true"]')!

    expect(colunas.map((coluna) => coluna.style.width)).toEqual([
      '',
      '',
      '6rem',
      '5rem',
      '',
      '4.25rem',
    ])
    expect(rotulos.getAttribute('style')).toContain(
      'grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 6rem 5rem minmax(0, 1fr) 4.25rem',
    )
    expect(Array.from(rotulos.children).map((rotulo) => rotulo.textContent)).toEqual([
      'Campo InvoiCy',
      'Tag do provedor',
      'Tipo',
      'Tamanho',
      'Exemplo',
      '',
    ])
  })

  it('tipo, tamanho e exemplo somem juntos em tela estreita: col, th e td', () => {
    const { detalhes } = renderizarBloco()
    const tabela = detalhes.querySelector('table')!

    const escondidas = (elementos: Element[]) =>
      elementos.map((elemento) => /\bhidden\b/.test(elemento.className))

    expect(escondidas(Array.from(tabela.querySelectorAll('col')))).toEqual([
      false,
      false,
      true,
      true,
      true,
      false,
    ])
    expect(escondidas(Array.from(tabela.querySelectorAll('thead th')))).toEqual([
      false,
      false,
      true,
      true,
      true,
      false,
    ])
    expect(escondidas(Array.from(tabela.querySelectorAll('tbody tr:first-child > td')))).toEqual([
      false,
      false,
      true,
      true,
      true,
      false,
    ])
  })

  it('sem exemplo na versão, a coluna Exemplo sai do colgroup, do cabeçalho, dos rótulos e das linhas', () => {
    const { detalhes } = renderizarBloco({ mostrarExemplo: false })
    const tabela = detalhes.querySelector('table')!
    const rotulos = detalhes.querySelector('div[aria-hidden="true"]')!

    expect(tabela.querySelectorAll('col')).toHaveLength(5)
    expect(Array.from(tabela.querySelectorAll('thead th')).map((th) => th.textContent)).toEqual([
      'Campo InvoiCy',
      'Tag do provedor',
      'Tipo',
      'Tamanho',
      'Rejeições registradas',
    ])
    expect(rotulos.getAttribute('style')).toContain(
      'grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 6rem 5rem 4.25rem',
    )
    expect(tabela.querySelectorAll('tbody tr:first-child > td')).toHaveLength(5)
  })
})

describe('BlocoDeCampos — linhas', () => {
  it('renderiza uma linha por campo e marca só o campo ativo', () => {
    const { detalhes } = renderizarBloco({ slugAtivo: 'servico-ibscbs-cclasstrib' })

    expect(detalhes.querySelectorAll('tbody tr')).toHaveLength(3)
    expect(detalhes.querySelectorAll('[aria-current="true"]')).toHaveLength(1)
    expect(
      detalhes.querySelector('#campo-servico-ibscbs-cclasstrib [aria-current="true"]'),
    ).not.toBeNull()
  })

  it('sem campo ativo, nenhuma linha leva aria-current', () => {
    const { detalhes } = renderizarBloco()

    expect(detalhes.querySelectorAll('[aria-current]')).toHaveLength(0)
  })

  it('abrir um campo repassa o slug, e o contador repassa a seção', () => {
    const { props } = renderizarBloco()

    fireEvent.click(screen.getByRole('button', { name: 'Discriminacao' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Ver a rejeição registrada no campo cClassTrib' }),
    )

    expect(props.onAbrirCampo).toHaveBeenNthCalledWith(1, 'servico-discriminacao')
    expect(props.onAbrirCampo).toHaveBeenNthCalledWith(2, 'servico-ibscbs-cclasstrib', 'rejeicoes')
  })
})

describe('BlocoDeCampos: corte em 10 campos', () => {
  const DOZE_CAMPOS = Array.from({ length: 12 }, (_, indice) => ({
    ...DISCRIMINACAO,
    campoLayoutSlug: `servico-campo-${indice}`,
    nome: `Campo${indice}`,
  }))
  const BLOCO_GRANDE = {
    ...BLOCO_DE_UM_SUBGRUPO_SEM_SLUG,
    totalDoBloco: 12,
    totalVisivel: 12,
    subgrupos: [{ chave: 'sem-grupo', grupoSlug: null, titulo: null, campos: DOZE_CAMPOS }],
  }

  function linhas(detalhes: HTMLElement) {
    return detalhes.querySelectorAll('tbody tr')
  }

  it('mostra 10 e diz quantos faltam; "Mostrar todos" abre o resto', () => {
    const { detalhes } = renderizarBloco({ bloco: BLOCO_GRANDE })

    expect(linhas(detalhes)).toHaveLength(10)
    expect(within(detalhes).getByText(/Mais 2 campos em Outros campos/)).toBeInTheDocument()

    fireEvent.click(within(detalhes).getByRole('button', { name: 'Mostrar todos' }))

    expect(linhas(detalhes)).toHaveLength(12)
  })

  it('com busca ou filtro ativo, não corta nada', () => {
    const { detalhes } = renderizarBloco({ bloco: BLOCO_GRANDE, filtrando: true })

    expect(linhas(detalhes)).toHaveLength(12)
    expect(within(detalhes).queryByRole('button', { name: 'Mostrar todos' })).toBeNull()
  })

  it('campo aberto por link fora dos 10 primeiros deixa o bloco inteiro à vista', () => {
    const { detalhes } = renderizarBloco({ bloco: BLOCO_GRANDE, slugAtivo: 'servico-campo-11' })

    expect(linhas(detalhes)).toHaveLength(12)
  })
})
