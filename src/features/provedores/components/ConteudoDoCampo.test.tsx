import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CampoVersaoPublico } from '../types/versaoProvedorPagina'
import { ConteudoDoCampo } from './ConteudoDoCampo'

/**
 * Campos transcritos da resposta real de `GET /provedores/emissor-nacional/versoes/0-20`, **sem
 * anotação do tipo do cliente**. O `exemplo` de `ValServicos` é o que a carga gravou (29155.75).
 * Em todos, `caminhoXml` ≠ `destinoXml`: uma fixture que dá o mesmo valor aos dois não separa o
 * que a tela copia do que ela mostra.
 */

/** Dois destinos, condição, notas em parágrafos, transformação e três rejeições; sem exemplo. */
const CAMPO_COM_DOIS_DESTINOS = {
  campoLayoutSlug: 'servico-paipreservico',
  nome: 'PaiPreServico',
  caminhoXml: '//Servico/PaiPreServico',
  significado:
    'País de prestação do serviço. Sigla do país onde o serviço foi prestado. Lista de siglas https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2',
  tipo: 'Texto',
  tamanho: '2',
  mascara: null,
  dominio: null,
  estadoPreenchimento: 'Condicional' as const,
  condicao: 'Informar apenas um entre: cLocPrestacao, cPaisPrestacao.',
  exemplo: null,
  notaPreenchimento:
    'Na DPS: Código do país onde ocorreu a prestação do serviço. (Tabela de Países ISO)\n\nFormato aceito pelo XSD: [A-Z]{2}',
  destinoXml:
    'DPS/infDPS/serv/locPrest/cPaisPrestacao | DPS/infDPS/valores/trib/tribMun/cPaisResult',
  notaTransformacao:
    'O InvoiCy grava este campo em 2 tags da DPS: DPS/infDPS/serv/locPrest/cPaisPrestacao, DPS/infDPS/valores/trib/tribMun/cPaisResult.',
  ordem: 150,
  errosConhecidos: [
    {
      slug: 'e0590-e-obrigatorio-informar-o-codigo-do-pais-onde-ocorreu-o-resultado-do-servico-prestado-para-os-cenarios-2-30-58-62-72-76-conforme-a-planilha',
      codigo: 'E0590',
    },
    {
      slug: 'e0304-informe-um-codigo-de-pais-existente-diferente-de-brasil-br-conforme-tabela-de-pais-iso2',
      codigo: 'E0304',
    },
    {
      slug: 'e0591-nao-e-permitido-informar-o-codigo-do-pais-onde-ocorreu-o-resultado-do-servico-prestado-para-os-cenarios-diferentes-de-2-30-58-62-72-76-conforme-a',
      codigo: 'E0591',
    },
  ],
}

const RESUMO_DAS_REJEICOES = [
  {
    slug: 'e0304-informe-um-codigo-de-pais-existente-diferente-de-brasil-br-conforme-tabela-de-pais-iso2',
    codigo: 'E0304',
    titulo:
      'Informe um código de país existente diferente de Brasil (BR), conforme tabela de país ISO2.',
    variantes: [
      'Informe um código de país existente diferente de Brasil (BR), conforme tabela de país ISO2.',
    ],
  },
  {
    slug: 'e0590-e-obrigatorio-informar-o-codigo-do-pais-onde-ocorreu-o-resultado-do-servico-prestado-para-os-cenarios-2-30-58-62-72-76-conforme-a-planilha',
    codigo: 'E0590',
    titulo:
      'É obrigatório informar o código do país onde ocorreu o resultado do serviço prestado para os cenários 2, 30, 58, 62, 72, 76, conforme a planilha…',
    variantes: [
      'É obrigatório informar o código do país onde ocorreu o resultado do serviço prestado para os cenários 2, 30, 58, 62, 72, 76, conforme a planilha "EXPORTACAO_EMISSÃO_NFS-e".',
    ],
  },
  {
    slug: 'e0591-nao-e-permitido-informar-o-codigo-do-pais-onde-ocorreu-o-resultado-do-servico-prestado-para-os-cenarios-diferentes-de-2-30-58-62-72-76-conforme-a',
    codigo: 'E0591',
    titulo:
      'Não é permitido informar o código do país onde ocorreu o resultado do serviço prestado para os cenários diferentes de 2, 30, 58, 62, 72, 76 conforme a…',
    variantes: [
      'Não é permitido informar o código do país onde ocorreu o resultado do serviço prestado para os cenários diferentes de 2, 30, 58, 62, 72, 76 conforme a planilha "EXPORTACAO_EMISSÃO_NFS-e".',
    ],
  },
]

/** Um destino só, com exemplo real. */
const CAMPO_COM_EXEMPLO = {
  campoLayoutSlug: 'servico-valores-valservicos',
  nome: 'ValServicos',
  caminhoXml: '//Servico/Valores/ValServicos',
  significado:
    'Valor dos serviços. Valor monetário do serviço (R$). (Para os códigos de tributação nacional do subitem 99.03, vServ = pCopropriedade x vTotOper)',
  tipo: 'Numérico',
  tamanho: '1 a 15 dígitos inteiros, com 2 decimais',
  mascara: null,
  dominio: null,
  estadoPreenchimento: 'Obrigatorio' as const,
  condicao: null,
  exemplo: '29155.75',
  notaPreenchimento: null,
  destinoXml: 'DPS/infDPS/valores/vServPrest/vServ',
  notaTransformacao: null,
  ordem: 164,
  errosConhecidos: [],
}

/** Tem `dominio`, `condicao` e nenhuma rejeição. */
const CAMPO_COM_VALORES_ACEITOS = {
  campoLayoutSlug: 'tpsusp',
  nome: 'tpSusp',
  caminhoXml: '//tpSusp',
  significado:
    'Opção para Exigibilidade suspensa. Valores aceitos: 1 - Exigibilidade Suspensa por Decisão Judicial; 2 - Exigibilidade Suspensa por Processo Administrativo',
  tipo: 'Numérico',
  tamanho: '1',
  mascara: null,
  dominio:
    '1 = Exigibilidade do ISSQN Suspensa por Decisão Judicial; 2 = Exigibilidade do ISSQN Suspensa por Processo Administrativo',
  estadoPreenchimento: 'Condicional' as const,
  condicao: 'Obrigatório quando o grupo exigSusp for informado.',
  exemplo: null,
  notaPreenchimento: 'Na DPS: Opção para Exigibilidade Suspensa.',
  destinoXml: 'DPS/infDPS/valores/trib/tribMun/exigSusp/tpSusp',
  notaTransformacao: null,
  ordem: 26,
  errosConhecidos: [],
}

const CAMPO_SEM_ATRIBUTOS_OPCIONAIS = {
  ...CAMPO_COM_VALORES_ACEITOS,
  mascara: null,
  dominio: null,
  condicao: '',
  notaPreenchimento: null,
  notaTransformacao: null,
}

function renderizar(campo: CampoVersaoPublico, errosResumo = RESUMO_DAS_REJEICOES) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <ConteudoDoCampo campo={campo} errosResumo={errosResumo} />,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(<RouterProvider router={router} />)
}

/** Âncora de montagem: o painel principal existe em todo campo. */
async function aguardarMontagem() {
  return screen.findByRole('region', { name: 'No InvoiCy' })
}

function valorDoCartaoDeResumo(rotulo: string) {
  return screen.getByText(rotulo, { selector: 'dt' }).nextElementSibling as HTMLElement
}

function configurarUsuarioComClipboard() {
  const usuario = userEvent.setup()
  const escreverNaAreaDeTransferencia = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue(undefined)

  return { usuario, escreverNaAreaDeTransferencia }
}

function vemDepois(anterior: HTMLElement, posterior: HTMLElement) {
  return Boolean(anterior.compareDocumentPosition(posterior) & Node.DOCUMENT_POSITION_FOLLOWING)
}

describe('ConteudoDoCampo — ordem das seções', () => {
  it('lê da explicação ao mapeamento: significado, resumo, InvoiCy, XML do provedor, preenchimento, transformação, rejeições', async () => {
    renderizar(CAMPO_COM_DOIS_DESTINOS)
    await aguardarMontagem()

    const secoes = [
      screen.getByText(/^País de prestação do serviço\./),
      screen.getByRole('heading', { name: 'Resumo' }),
      screen.getByRole('heading', { name: 'No InvoiCy' }),
      screen.getByRole('heading', { name: 'No XML do provedor' }),
      screen.getByRole('heading', { name: 'Como preencher' }),
      screen.getByRole('heading', { name: 'Transformação' }),
      screen.getByRole('heading', { name: 'Rejeições registradas (3)' }),
    ]

    secoes.slice(1).forEach((secao, indice) => {
      expect(vemDepois(secoes[indice], secao)).toBe(true)
    })
  })
})

describe('ConteudoDoCampo — resumo', () => {
  it('mostra tipo, tamanho, exemplo e a contagem de rejeições', async () => {
    renderizar(CAMPO_COM_DOIS_DESTINOS)
    await aguardarMontagem()

    expect(valorDoCartaoDeResumo('Tipo')).toHaveTextContent('Texto')
    expect(valorDoCartaoDeResumo('Tamanho')).toHaveTextContent('2')
    expect(valorDoCartaoDeResumo('Rejeições')).toHaveTextContent('3')
  })

  it('sem exemplo, diz "sem exemplo real"', async () => {
    renderizar(CAMPO_COM_DOIS_DESTINOS)
    await aguardarMontagem()

    expect(valorDoCartaoDeResumo('Exemplo')).toHaveTextContent('sem exemplo real')
  })

  it('com exemplo, mostra o valor no resumo', async () => {
    renderizar(CAMPO_COM_EXEMPLO)
    await aguardarMontagem()

    expect(valorDoCartaoDeResumo('Exemplo')).toHaveTextContent('29155.75')
    expect(valorDoCartaoDeResumo('Exemplo')).not.toHaveTextContent('sem exemplo real')
  })

  it('tamanho ausente vira traço, com texto para leitor de tela', async () => {
    renderizar({ ...CAMPO_COM_EXEMPLO, tamanho: null })
    await aguardarMontagem()

    const tamanho = valorDoCartaoDeResumo('Tamanho')

    expect(tamanho).toHaveTextContent('—')
    expect(within(tamanho).getByText('não informado')).toHaveClass('sr-only')
  })

  it('sem rejeições, o cartão diz "nenhuma" e a seção de rejeições não existe', async () => {
    renderizar(CAMPO_COM_EXEMPLO)
    await aguardarMontagem()

    expect(valorDoCartaoDeResumo('Rejeições')).toHaveTextContent('nenhuma')
    expect(screen.queryByRole('heading', { name: /Rejeições registradas/ })).toBeNull()
  })
})

describe('ConteudoDoCampo — No InvoiCy e No XML do provedor', () => {
  it('o botão do InvoiCy copia o caminho que a tela mostra; o de cada destino, o caminho daquele destino', async () => {
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    renderizar(CAMPO_COM_DOIS_DESTINOS)
    await aguardarMontagem()

    await usuario.click(
      screen.getByRole('button', { name: 'Copiar caminho do campo PaiPreServico no InvoiCy' }),
    )
    expect(escreverNaAreaDeTransferencia).toHaveBeenLastCalledWith('//Servico/PaiPreServico')

    await usuario.click(
      screen.getByRole('button', {
        name: 'Copiar caminho do destino DPS/infDPS/serv/locPrest/cPaisPrestacao',
      }),
    )
    expect(escreverNaAreaDeTransferencia).toHaveBeenLastCalledWith(
      'DPS/infDPS/serv/locPrest/cPaisPrestacao',
    )

    await usuario.click(
      screen.getByRole('button', {
        name: 'Copiar caminho do destino DPS/infDPS/valores/trib/tribMun/cPaisResult',
      }),
    )
    expect(escreverNaAreaDeTransferencia).toHaveBeenLastCalledWith(
      'DPS/infDPS/valores/trib/tribMun/cPaisResult',
    )
  })

  it('dois destinos viram dois blocos de XML, dois botões e o aviso de duas tags — nunca um texto com " | "', async () => {
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    renderizar(CAMPO_COM_DOIS_DESTINOS)
    await aguardarMontagem()

    expect(screen.getAllByRole('group', { name: /^Caminho no XML do provedor:/ })).toHaveLength(2)
    expect(screen.getByText('Este campo alimenta 2 tags do XML do provedor.')).toBeInTheDocument()

    const botoesDeDestino = screen.getAllByRole('button', { name: /^Copiar caminho do destino / })
    expect(botoesDeDestino).toHaveLength(2)

    for (const botao of botoesDeDestino) await usuario.click(botao)

    for (const [texto] of escreverNaAreaDeTransferencia.mock.calls) {
      expect(texto).not.toContain(' | ')
    }
  })

  it('um destino só não ganha o aviso de várias tags', async () => {
    renderizar(CAMPO_COM_EXEMPLO)
    await aguardarMontagem()

    expect(screen.queryByText(/alimenta \d+ tags/)).toBeNull()
    expect(screen.getAllByRole('group', { name: /^Caminho no XML do provedor:/ })).toHaveLength(1)
  })

  it('com um destino e exemplo, o valor entra na tag e a legenda diz "exemplo real"', async () => {
    renderizar(CAMPO_COM_EXEMPLO)
    await aguardarMontagem()

    const xml = screen.getByRole('group', {
      name: 'Caminho no XML do provedor: DPS/infDPS/valores/vServPrest/vServ',
    })
    const linhas = Array.from(xml.querySelectorAll('[data-linha]')).map((l) => l.textContent)

    expect(linhas).toContain('<vServ>29155.75</vServ>')
    expect(screen.getByText('exemplo real')).toBeInTheDocument()
  })

  it('com dois destinos, o exemplo do campo não é atribuído a nenhuma das tags', async () => {
    renderizar({ ...CAMPO_COM_DOIS_DESTINOS, exemplo: '29155.75' })
    await aguardarMontagem()

    const blocos = screen.getAllByRole('group', { name: /^Caminho no XML do provedor:/ })

    expect(valorDoCartaoDeResumo('Exemplo')).toHaveTextContent('29155.75')
    for (const bloco of blocos) {
      expect(bloco.textContent).not.toContain('29155.75')
      expect(bloco.textContent).toContain('…')
    }
    expect(screen.queryByText('exemplo real')).toBeNull()
  })

  it('sem destino, diz que o campo não tem destino e não desenha XML nem conector', async () => {
    renderizar({ ...CAMPO_COM_EXEMPLO, destinoXml: null })
    await aguardarMontagem()

    expect(screen.getByText('Este campo não tem destino no XML do provedor.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /^Caminho no XML do provedor:/ })).toBeNull()
    expect(screen.queryByText('vira, no provedor')).toBeNull()
  })

  it('destino omitido vira o aviso, sem bloco de XML nem botão de copiar', async () => {
    renderizar({ ...CAMPO_COM_EXEMPLO, destinoXml: '…' })
    await aguardarMontagem()

    expect(screen.getByText('e mais destinos (ver Transformação).')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /^Caminho no XML do provedor:/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Copiar caminho do destino / })).toBeNull()
  })

  it('destino real seguido de omitidos mantém o bloco do real e só o aviso para o resto', async () => {
    renderizar({
      ...CAMPO_COM_DOIS_DESTINOS,
      destinoXml: 'DPS/infDPS/serv/locPrest/cPaisPrestacao | …',
    })
    await aguardarMontagem()

    expect(screen.getAllByRole('group', { name: /^Caminho no XML do provedor:/ })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /^Copiar caminho do destino / })).toHaveLength(1)
    expect(screen.getByText('e mais destinos (ver Transformação).')).toBeInTheDocument()
    expect(screen.queryByText(/alimenta \d+ tags/)).toBeNull()
  })

  it('o painel do InvoiCy domina: borda forte e caminho maior; o do provedor, não', async () => {
    renderizar(CAMPO_COM_EXEMPLO)
    const painelDoInvoicy = await aguardarMontagem()
    const painelDoProvedor = screen.getByRole('region', { name: 'No XML do provedor' })

    expect(painelDoInvoicy).toHaveClass('border-2')
    expect(painelDoProvedor).not.toHaveClass('border-2')

    expect(painelDoInvoicy.querySelector('.text-\\[15px\\]')).not.toBeNull()
    expect(painelDoInvoicy.querySelector('.text-\\[13px\\]')).toBeNull()
    expect(painelDoProvedor.querySelector('.text-\\[15px\\]')).toBeNull()
  })
})

describe('ConteudoDoCampo — como preencher', () => {
  it('chama o domínio de "Valores aceitos" e mostra o termo antigo em lugar nenhum', async () => {
    renderizar(CAMPO_COM_VALORES_ACEITOS)
    await aguardarMontagem()

    expect(screen.getByText('Valores aceitos')).toBeInTheDocument()
    expect(screen.getByText(/^1 = Exigibilidade do ISSQN Suspensa/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Domínio')
  })

  it('mostra só os atributos preenchidos', async () => {
    renderizar(CAMPO_COM_VALORES_ACEITOS)
    await aguardarMontagem()

    expect(screen.getByText('Condição')).toBeInTheDocument()
    expect(screen.getByText('Nota de preenchimento')).toBeInTheDocument()
    expect(screen.queryByText('Máscara')).toBeNull()
  })

  it('sem nenhum atributo, a seção inteira some — texto vazio inclusive', async () => {
    renderizar(CAMPO_SEM_ATRIBUTOS_OPCIONAIS)
    await aguardarMontagem()

    expect(screen.queryByRole('region', { name: 'Como preencher' })).toBeNull()
    expect(screen.queryByText('Condição')).toBeNull()
  })

  it('preserva os parágrafos da nota de preenchimento', async () => {
    renderizar(CAMPO_COM_DOIS_DESTINOS)
    await aguardarMontagem()

    const nota = screen.getByText('Nota de preenchimento').nextElementSibling as HTMLElement

    expect(nota.textContent).toBe(CAMPO_COM_DOIS_DESTINOS.notaPreenchimento)
    expect(nota.textContent).toContain('\n\n')
    expect(nota).toHaveClass('whitespace-pre-line')
  })
})

describe('ConteudoDoCampo — transformação e rejeições', () => {
  it('mostra a nota de transformação preservando as quebras; sem ela, a seção some', async () => {
    const { unmount } = renderizar(CAMPO_COM_DOIS_DESTINOS)
    await aguardarMontagem()

    const secao = screen.getByRole('region', { name: 'Transformação' })
    expect(secao).toHaveTextContent(CAMPO_COM_DOIS_DESTINOS.notaTransformacao)
    expect(within(secao).getByText(/^O InvoiCy grava/)).toHaveClass('whitespace-pre-line')
    unmount()

    renderizar(CAMPO_COM_EXEMPLO)
    await aguardarMontagem()
    expect(screen.queryByRole('region', { name: 'Transformação' })).toBeNull()
  })

  it('nota de transformação vazia vale como ausente', async () => {
    renderizar({ ...CAMPO_COM_EXEMPLO, notaTransformacao: '' })
    await aguardarMontagem()

    expect(screen.queryByRole('region', { name: 'Transformação' })).toBeNull()
  })

  it('lista as rejeições do campo, com link para a página de cada erro', async () => {
    renderizar(CAMPO_COM_DOIS_DESTINOS)

    const secao = await screen.findByRole('region', { name: 'Rejeições registradas (3)' })

    expect(within(secao).getAllByRole('link')).toHaveLength(3)
  })
})
