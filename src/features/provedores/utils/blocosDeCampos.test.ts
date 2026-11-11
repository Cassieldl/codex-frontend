import { describe, expect, it } from 'vitest'

import { ROTULOS_DE_BLOCO, normalizarParaBusca } from '../../../utils/blocosDoLayout'
import type { EstadoPreenchimentoCampo } from '../types/versaoProvedorPagina'
import {
  ESTADO_PARA_ETIQUETA,
  campoPassaNoFiltro,
  contarPorEstado,
  filtrarCampos,
  montarBlocos,
  sequenciaVisivel,
} from './blocosDeCampos'

function campo(
  campoLayoutSlug: string,
  nome: string,
  caminhoXml: string,
  destinoXml: string | null,
  estadoPreenchimento: EstadoPreenchimentoCampo,
) {
  return {
    campoLayoutSlug,
    nome,
    caminhoXml,
    significado: 'Texto explicativo do campo.',
    reformaTributaria: false,
    tipo: 'string',
    tamanho: null,
    mascara: null,
    dominio: null,
    estadoPreenchimento,
    condicao: null,
    exemplo: null,
    notaPreenchimento: null,
    destinoXml,
    notaTransformacao: null,
    ordem: 1,
    errosConhecidos: [],
  }
}

const campoCodigoServico = campo(
  'codigo-servico',
  'Código do serviço',
  'Servico/cServ',
  'DPS/infDPS/serv/cServ | DPS/infDPS/alt/cTrib',
  'Obrigatorio',
)
const campoCnpjTomador = campo(
  'cnpj-tomador',
  'CNPJ do tomador',
  'Tomador/CNPJ',
  null,
  'Obrigatorio',
)
const campoValorServico = campo(
  'valor-servico',
  'Valor do serviço',
  'Servico/Valores/vServ',
  'DPS/infDPS/valores/vServPrest',
  'Opcional',
)
const campoInscricaoEstadual = campo(
  'inscricao-estadual',
  'Inscrição estadual',
  'Prestador/IE',
  'DPS/infDPS/prest/IEPrest',
  'Condicional',
)
const campoBaseIbs = campo(
  'base-ibs',
  'Base do IBS',
  'Servico/Valores/IBSCBS/vBC',
  'DPS/infDPS/IBSCBS/valores/baseCalculo',
  'Obrigatorio',
)
const campoAliquotaCbs = campo(
  'aliquota-cbs',
  'Alíquota da CBS',
  'Servico/Valores/IBSCBS/pCBS',
  'DPS/infDPS/IBSCBS/valores/aliquotaCBS',
  'Opcional',
)

// Três raízes fora de ordem alfabética e a raiz Servico em três grupos não contíguos.
const camposPorGrupo = [
  { grupo: 'Servico', grupoSlug: 'servico', campos: [campoCodigoServico] },
  { grupo: 'Tomador', grupoSlug: 'tomador', campos: [campoCnpjTomador] },
  { grupo: 'Servico/Valores', grupoSlug: 'servico-valores', campos: [campoValorServico] },
  { grupo: 'Prestador', grupoSlug: 'prestador', campos: [campoInscricaoEstadual] },
  {
    grupo: 'Servico/Valores/IBSCBS',
    grupoSlug: 'servico-valores-ibscbs',
    campos: [campoBaseIbs, campoAliquotaCbs],
  },
]

const SEM_FILTRO = { estado: 'todos', termo: '', somenteReformaTributaria: false } as const

describe('montarBlocos', () => {
  it('ordena os blocos pela primeira aparição, nem alfabética nem inversa', () => {
    const blocos = montarBlocos(camposPorGrupo)

    expect(blocos.map((bloco) => bloco.raiz)).toEqual(['Servico', 'Tomador', 'Prestador'])
  })

  it('junta no bloco da primeira aparição os grupos da mesma raiz que vieram separados', () => {
    const [servico] = montarBlocos(camposPorGrupo)

    expect(servico.subgrupos.map((subgrupo) => subgrupo.chave)).toEqual([
      'servico',
      'servico-valores',
      'servico-valores-ibscbs',
    ])
  })

  it('calcula os totais do bloco sem filtro', () => {
    const [servico, tomador, prestador] = montarBlocos(camposPorGrupo)

    expect(servico).toMatchObject({ totalDoBloco: 4, obrigatoriosDoBloco: 2, totalVisivel: 4 })
    expect(tomador).toMatchObject({ totalDoBloco: 1, obrigatoriosDoBloco: 1, totalVisivel: 1 })
    expect(prestador).toMatchObject({ totalDoBloco: 1, obrigatoriosDoBloco: 0, totalVisivel: 1 })
  })

  it('titula o subgrupo pelos segmentos depois da raiz', () => {
    const [servico] = montarBlocos(camposPorGrupo)

    expect(servico.subgrupos.map((subgrupo) => subgrupo.titulo)).toEqual([
      'Campos gerais',
      'Valores',
      'Valores › IBSCBS',
    ])
  })

  it('não titula o bloco de um subgrupo só, mesmo quando o grupo é a própria raiz', () => {
    const [, tomador, prestador] = montarBlocos(camposPorGrupo)

    expect(tomador.subgrupos.map((subgrupo) => subgrupo.titulo)).toEqual([null])
    expect(prestador.subgrupos.map((subgrupo) => subgrupo.titulo)).toEqual([null])
  })

  it('usa o rótulo do catálogo e guarda a chave e o slug do subgrupo', () => {
    const [servico, tomador] = montarBlocos(camposPorGrupo)

    expect(servico.rotulo).toBe('Serviço')
    expect(tomador.rotulo).toBe('Tomador')
    expect(servico.subgrupos[1]).toMatchObject({
      chave: 'servico-valores',
      grupoSlug: 'servico-valores',
    })
  })

  it('manda campo com grupo null ou vazio para o bloco "Outros campos"', () => {
    const blocos = montarBlocos([
      { grupo: null, grupoSlug: null, campos: [campoCodigoServico] },
      { grupo: '', grupoSlug: null, campos: [campoCnpjTomador] },
    ])

    expect(blocos).toHaveLength(1)
    expect(blocos[0]).toMatchObject({ raiz: 'outros', rotulo: 'Outros campos', totalDoBloco: 2 })
    expect(blocos[0].subgrupos).toHaveLength(1)
    expect(blocos[0].subgrupos[0]).toMatchObject({ chave: 'sem-grupo', titulo: null })
  })

  it('usa o texto cru da raiz quando ela não está no catálogo', () => {
    const [bloco] = montarBlocos([
      { grupo: 'RaizNova/Filho', grupoSlug: 'raiznova-filho', campos: [campoCodigoServico] },
    ])

    expect(bloco.raiz).toBe('RaizNova')
    expect(bloco.rotulo).toBe('RaizNova')
  })

  it('usa o grupo como chave quando não há grupoSlug', () => {
    const [bloco] = montarBlocos([
      { grupo: 'Servico/Valores', grupoSlug: null, campos: [campoValorServico] },
    ])

    expect(bloco.subgrupos[0]).toMatchObject({ chave: 'Servico/Valores', grupoSlug: null })
  })
})

describe('sequenciaVisivel', () => {
  it('segue a ordem do DOM (bloco, subgrupo, campo), diferente da ordem de entrada', () => {
    const sequencia = sequenciaVisivel(montarBlocos(camposPorGrupo))

    expect(sequencia.map((item) => item.campo.campoLayoutSlug)).toEqual([
      'codigo-servico',
      'valor-servico',
      'base-ibs',
      'aliquota-cbs',
      'cnpj-tomador',
      'inscricao-estadual',
    ])
  })

  it('monta a trilha com o rótulo do bloco e o título do subgrupo', () => {
    const sequencia = sequenciaVisivel(montarBlocos(camposPorGrupo))

    expect(sequencia.map((item) => item.trilha)).toEqual([
      'Serviço › Campos gerais',
      'Serviço › Valores',
      'Serviço › Valores › IBSCBS',
      'Serviço › Valores › IBSCBS',
      'Tomador',
      'Prestador',
    ])
  })

  it('informa a raiz de cada campo', () => {
    const sequencia = sequenciaVisivel(montarBlocos(camposPorGrupo))

    expect(sequencia.map((item) => item.raiz)).toEqual([
      'Servico',
      'Servico',
      'Servico',
      'Servico',
      'Tomador',
      'Prestador',
    ])
  })

  it('respeita o filtro', () => {
    const filtrados = filtrarCampos(montarBlocos(camposPorGrupo), {
      estado: 'Obrigatorio',
      termo: '',
      somenteReformaTributaria: false,
    })

    expect(sequenciaVisivel(filtrados).map((item) => item.campo.campoLayoutSlug)).toEqual([
      'codigo-servico',
      'base-ibs',
      'cnpj-tomador',
    ])
  })
})

describe('filtrarCampos', () => {
  it('mantém todos os blocos, mesmo os que ficam sem campo visível', () => {
    const filtrados = filtrarCampos(montarBlocos(camposPorGrupo), {
      estado: 'todos',
      termo: 'basecalculo',
      somenteReformaTributaria: false,
    })

    expect(filtrados.map((bloco) => bloco.raiz)).toEqual(['Servico', 'Tomador', 'Prestador'])
    expect(filtrados.map((bloco) => bloco.totalVisivel)).toEqual([1, 0, 0])
  })

  it('preserva totalDoBloco e obrigatoriosDoBloco', () => {
    const [servico] = filtrarCampos(montarBlocos(camposPorGrupo), {
      estado: 'todos',
      termo: 'basecalculo',
      somenteReformaTributaria: false,
    })

    expect(servico.totalDoBloco).toBe(4)
    expect(servico.obrigatoriosDoBloco).toBe(2)
  })

  it('remove o subgrupo que fica sem campo', () => {
    const [servico] = filtrarCampos(montarBlocos(camposPorGrupo), {
      estado: 'todos',
      termo: 'basecalculo',
      somenteReformaTributaria: false,
    })

    expect(servico.subgrupos.map((subgrupo) => subgrupo.chave)).toEqual(['servico-valores-ibscbs'])
  })

  it('não muda o título do subgrupo quando o filtro deixa um só', () => {
    const [servicoSoIbscbs] = filtrarCampos(montarBlocos(camposPorGrupo), {
      estado: 'todos',
      termo: 'basecalculo',
      somenteReformaTributaria: false,
    })
    const [servicoSoGerais] = filtrarCampos(montarBlocos(camposPorGrupo), {
      estado: 'todos',
      termo: 'cserv',
      somenteReformaTributaria: false,
    })

    expect(servicoSoIbscbs.subgrupos.map((subgrupo) => subgrupo.titulo)).toEqual([
      'Valores › IBSCBS',
    ])
    expect(servicoSoGerais.subgrupos.map((subgrupo) => subgrupo.titulo)).toEqual(['Campos gerais'])
  })

  it('combina estado e busca', () => {
    const filtrados = filtrarCampos(montarBlocos(camposPorGrupo), {
      estado: 'Obrigatorio',
      termo: 'ibscbs',
      somenteReformaTributaria: false,
    })

    expect(sequenciaVisivel(filtrados).map((item) => item.campo.campoLayoutSlug)).toEqual([
      'base-ibs',
    ])
  })

  it('com filtro neutro mantém todos os campos', () => {
    const filtrados = filtrarCampos(montarBlocos(camposPorGrupo), SEM_FILTRO)

    expect(filtrados.map((bloco) => bloco.totalVisivel)).toEqual([4, 1, 1])
  })
})

describe('campoPassaNoFiltro', () => {
  it('acha pelo nome, sem acento e sem diferenciar maiúscula', () => {
    expect(
      campoPassaNoFiltro(campoCodigoServico, {
        estado: 'todos',
        termo: 'CODIGO DO',
        somenteReformaTributaria: false,
      }),
    ).toBe(true)
    expect(
      campoPassaNoFiltro(campoAliquotaCbs, {
        estado: 'todos',
        termo: 'aliquota da',
        somenteReformaTributaria: false,
      }),
    ).toBe(true)
  })

  it('acha pelo caminhoXml', () => {
    expect(
      campoPassaNoFiltro(campoCnpjTomador, {
        estado: 'todos',
        termo: 'tomador/cnpj',
        somenteReformaTributaria: false,
      }),
    ).toBe(true)
  })

  it('acha pelo destinoXml inteiro, inclusive o segundo destino', () => {
    expect(
      campoPassaNoFiltro(campoBaseIbs, {
        estado: 'todos',
        termo: 'BASECALCULO',
        somenteReformaTributaria: false,
      }),
    ).toBe(true)
    expect(
      campoPassaNoFiltro(campoCodigoServico, {
        estado: 'todos',
        termo: 'alt/ctrib',
        somenteReformaTributaria: false,
      }),
    ).toBe(true)
  })

  it('não acha por texto que só existe no significado', () => {
    expect(
      campoPassaNoFiltro(campoCodigoServico, {
        estado: 'todos',
        termo: 'texto explicativo',
        somenteReformaTributaria: false,
      }),
    ).toBe(false)
  })

  it('campo sem destinoXml não casa com termo de outro campo', () => {
    expect(
      campoPassaNoFiltro(campoCnpjTomador, {
        estado: 'todos',
        termo: 'basecalculo',
        somenteReformaTributaria: false,
      }),
    ).toBe(false)
  })

  it('exige o estado quando ele não é "todos"', () => {
    expect(
      campoPassaNoFiltro(campoBaseIbs, {
        estado: 'Opcional',
        termo: '',
        somenteReformaTributaria: false,
      }),
    ).toBe(false)
    expect(
      campoPassaNoFiltro(campoBaseIbs, {
        estado: 'Obrigatorio',
        termo: '',
        somenteReformaTributaria: false,
      }),
    ).toBe(true)
  })

  it('exige estado e termo ao mesmo tempo', () => {
    expect(
      campoPassaNoFiltro(campoBaseIbs, {
        estado: 'Opcional',
        termo: 'basecalculo',
        somenteReformaTributaria: false,
      }),
    ).toBe(false)
    expect(
      campoPassaNoFiltro(campoBaseIbs, {
        estado: 'Obrigatorio',
        termo: 'basecalculo',
        somenteReformaTributaria: false,
      }),
    ).toBe(true)
  })

  it('ignora espaços nas pontas do termo', () => {
    expect(
      campoPassaNoFiltro(campoBaseIbs, {
        estado: 'todos',
        termo: '  basecalculo  ',
        somenteReformaTributaria: false,
      }),
    ).toBe(true)
  })
})

describe('contarPorEstado', () => {
  it('conta a versão inteira por estado', () => {
    expect(contarPorEstado(camposPorGrupo)).toEqual({
      todos: 6,
      Obrigatorio: 3,
      Opcional: 2,
      Condicional: 1,
    })
  })

  it('não é afetada pelo filtro: o termo só age sobre os blocos', () => {
    const filtrados = filtrarCampos(montarBlocos(camposPorGrupo), {
      estado: 'todos',
      termo: 'basecalculo',
      somenteReformaTributaria: false,
    })

    expect(sequenciaVisivel(filtrados)).toHaveLength(1)
    expect(contarPorEstado(camposPorGrupo).todos).toBe(6)
  })

  it('zera os estados quando não há campo', () => {
    expect(contarPorEstado([])).toEqual({ todos: 0, Obrigatorio: 0, Opcional: 0, Condicional: 0 })
  })
})

describe('normalizarParaBusca', () => {
  it('tira acento, passa para minúscula e apara', () => {
    expect(normalizarParaBusca('  Inscrição ESTADUAL ')).toBe('inscricao estadual')
  })
})

describe('ROTULOS_DE_BLOCO', () => {
  it('cobre exatamente as 22 raízes reais', () => {
    expect(Object.keys(ROTULOS_DE_BLOCO).sort()).toEqual(
      [
        'AtividadeEvento',
        'ConstCivil',
        'Destinatario',
        'Envio',
        'Imovel',
        'IntermServico',
        'ListaBensMoveis',
        'ListaDed',
        'ListaDedIBSCBS',
        'ListaDocumentos',
        'ListaItens',
        'ListaNFSeRefPagAntecipado',
        'ListaNFSeReferenciadas',
        'ListaPagamentoVinculado',
        'ListaParcelas',
        'Locacao',
        'Pedagio',
        'Prestador',
        'RPS',
        'Servico',
        'Tomador',
        'Transportadora',
      ].sort(),
    )
  })

  it('confere alguns rótulos um a um', () => {
    expect(ROTULOS_DE_BLOCO.ListaPagamentoVinculado).toBe('Pagamento vinculado')
    expect(ROTULOS_DE_BLOCO.Envio).toBe('Dados do envio')
    expect(ROTULOS_DE_BLOCO.ListaDedIBSCBS).toBe('Deduções IBS/CBS')
  })
})

describe('ESTADO_PARA_ETIQUETA', () => {
  it('traduz o estado da API para o da etiqueta', () => {
    expect(ESTADO_PARA_ETIQUETA).toEqual({
      Obrigatorio: 'obrigatorio',
      Opcional: 'opcional',
      Condicional: 'condicional',
    })
  })
})

describe('campoPassaNoFiltro, só campos da reforma tributária', () => {
  const daReforma = { ...campoBaseIbs, reformaTributaria: true }
  const soReforma = (termo: string) =>
    ({ estado: 'todos', termo, somenteReformaTributaria: true }) as const

  it('barra o campo de fora da reforma e aplica o termo ao da reforma', () => {
    expect(campoPassaNoFiltro(campoCnpjTomador, soReforma(''))).toBe(false)
    expect(campoPassaNoFiltro(daReforma, soReforma(''))).toBe(true)
    expect(campoPassaNoFiltro(daReforma, soReforma('basecalculo'))).toBe(true)
    expect(campoPassaNoFiltro(daReforma, soReforma('zzz-inexistente'))).toBe(false)
  })

  it('combina com a obrigatoriedade', () => {
    const outroEstado = daReforma.estadoPreenchimento === 'Obrigatorio' ? 'Opcional' : 'Obrigatorio'

    expect(
      campoPassaNoFiltro(daReforma, {
        estado: outroEstado,
        termo: '',
        somenteReformaTributaria: true,
      }),
    ).toBe(false)
  })
})
