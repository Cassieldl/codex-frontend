import { describe, expect, it } from 'vitest'

import {
  ROTULOS_DE_BLOCO,
  SEPARADOR_DA_TRILHA,
  agruparEmBlocos,
  filtrarBlocos,
  normalizarParaBusca,
  sequenciaDosBlocos,
} from './blocosDoLayout'

interface CampoDeTeste {
  slug: string
}

function campos(...slugs: string[]): CampoDeTeste[] {
  return slugs.map((slug) => ({ slug }))
}

// Três raízes fora de ordem alfabética e a raiz Servico em três grupos não contíguos.
const grupos = [
  { grupo: 'Servico', grupoSlug: 'servico', campos: campos('codigo-servico') },
  { grupo: 'Tomador', grupoSlug: 'tomador', campos: campos('cnpj-tomador') },
  { grupo: 'Servico/Valores', grupoSlug: 'servico-valores', campos: campos('valor-servico') },
  { grupo: 'Prestador', grupoSlug: 'prestador', campos: campos('inscricao-estadual') },
  {
    grupo: 'Servico/Valores/IBSCBS',
    grupoSlug: 'servico-valores-ibscbs',
    campos: campos('base-ibs', 'aliquota-cbs'),
  },
]

function slugs(sequencia: { campo: CampoDeTeste }[]): string[] {
  return sequencia.map((item) => item.campo.slug)
}

describe('agruparEmBlocos', () => {
  it('ordena os blocos pela primeira aparição, nem alfabética nem inversa', () => {
    const blocos = agruparEmBlocos(grupos)

    expect(blocos.map((bloco) => bloco.raiz)).toEqual(['Servico', 'Tomador', 'Prestador'])
  })

  it('junta no bloco da primeira aparição os grupos da mesma raiz que vieram separados', () => {
    const [servico] = agruparEmBlocos(grupos)

    expect(servico.subgrupos.map((subgrupo) => subgrupo.chave)).toEqual([
      'servico',
      'servico-valores',
      'servico-valores-ibscbs',
    ])
  })

  it('titula o subgrupo pelos segmentos depois da raiz, separados por " › "', () => {
    const [servico] = agruparEmBlocos(grupos)

    expect(servico.subgrupos.map((subgrupo) => subgrupo.titulo)).toEqual([
      'Campos gerais',
      'Valores',
      'Valores › IBSCBS',
    ])
  })

  it('não titula o bloco de um subgrupo só, mesmo quando o grupo é a própria raiz', () => {
    const [, tomador, prestador] = agruparEmBlocos(grupos)

    expect(tomador.subgrupos.map((subgrupo) => subgrupo.titulo)).toEqual([null])
    expect(prestador.subgrupos.map((subgrupo) => subgrupo.titulo)).toEqual([null])
  })

  it('calcula os totais do bloco, iguais antes de filtrar', () => {
    const [servico, tomador, prestador] = agruparEmBlocos(grupos)

    expect(servico).toMatchObject({ totalDoBloco: 4, totalVisivel: 4 })
    expect(tomador).toMatchObject({ totalDoBloco: 1, totalVisivel: 1 })
    expect(prestador).toMatchObject({ totalDoBloco: 1, totalVisivel: 1 })
  })

  it('usa o rótulo do catálogo e guarda a chave e o slug do subgrupo', () => {
    const [servico, tomador] = agruparEmBlocos(grupos)

    expect(servico.rotulo).toBe('Serviço')
    expect(tomador.rotulo).toBe('Tomador')
    expect(servico.subgrupos[1]).toMatchObject({
      chave: 'servico-valores',
      grupoSlug: 'servico-valores',
    })
  })

  it('manda campo com grupo null ou vazio para o bloco "Outros campos"', () => {
    const blocos = agruparEmBlocos([
      { grupo: null, grupoSlug: null, campos: campos('a') },
      { grupo: '', grupoSlug: null, campos: campos('b') },
    ])

    expect(blocos).toHaveLength(1)
    expect(blocos[0]).toMatchObject({ raiz: 'outros', rotulo: 'Outros campos', totalDoBloco: 2 })
    expect(blocos[0].subgrupos).toHaveLength(1)
    expect(blocos[0].subgrupos[0]).toMatchObject({ chave: 'sem-grupo', titulo: null })
  })

  it('usa o texto cru da raiz quando ela não está no catálogo', () => {
    const [bloco] = agruparEmBlocos([
      { grupo: 'RaizNova/Filho', grupoSlug: 'raiznova-filho', campos: campos('a') },
    ])

    expect(bloco.raiz).toBe('RaizNova')
    expect(bloco.rotulo).toBe('RaizNova')
  })

  it('usa o grupo como chave quando não há grupoSlug', () => {
    const [bloco] = agruparEmBlocos([
      { grupo: 'Servico/Valores', grupoSlug: null, campos: campos('a') },
    ])

    expect(bloco.subgrupos[0]).toMatchObject({ chave: 'Servico/Valores', grupoSlug: null })
  })

  it('soma os campos do mesmo grupo repetido sem alterar a entrada', () => {
    const entrada = [
      { grupo: 'Servico', grupoSlug: 'servico', campos: campos('a') },
      { grupo: 'Servico', grupoSlug: 'servico', campos: campos('b') },
    ]

    const [bloco] = agruparEmBlocos(entrada)

    expect(bloco.subgrupos[0].campos).toEqual([{ slug: 'a' }, { slug: 'b' }])
    expect(entrada[0].campos).toEqual([{ slug: 'a' }])
  })

  it('devolve lista vazia quando não há grupo', () => {
    expect(agruparEmBlocos([])).toEqual([])
  })
})

describe('filtrarBlocos', () => {
  const soIbscbs = (campo: CampoDeTeste) => campo.slug === 'base-ibs'

  it('mantém todos os blocos, mesmo os que ficam sem campo visível', () => {
    const filtrados = filtrarBlocos(agruparEmBlocos(grupos), soIbscbs)

    expect(filtrados.map((bloco) => bloco.raiz)).toEqual(['Servico', 'Tomador', 'Prestador'])
    expect(filtrados.map((bloco) => bloco.totalVisivel)).toEqual([1, 0, 0])
  })

  it('preserva totalDoBloco', () => {
    const [servico] = filtrarBlocos(agruparEmBlocos(grupos), soIbscbs)

    expect(servico.totalDoBloco).toBe(4)
  })

  it('remove o subgrupo que fica sem campo', () => {
    const [servico, tomador] = filtrarBlocos(agruparEmBlocos(grupos), soIbscbs)

    expect(servico.subgrupos.map((subgrupo) => subgrupo.chave)).toEqual(['servico-valores-ibscbs'])
    expect(tomador.subgrupos).toEqual([])
  })

  it('não muda o título do subgrupo quando o filtro deixa um só', () => {
    const [servico] = filtrarBlocos(agruparEmBlocos(grupos), soIbscbs)

    expect(servico.subgrupos.map((subgrupo) => subgrupo.titulo)).toEqual(['Valores › IBSCBS'])
  })

  it('com predicado que aceita tudo mantém todos os campos', () => {
    const filtrados = filtrarBlocos(agruparEmBlocos(grupos), () => true)

    expect(filtrados.map((bloco) => bloco.totalVisivel)).toEqual([4, 1, 1])
  })

  it('não altera os blocos de entrada', () => {
    const blocos = agruparEmBlocos(grupos)

    filtrarBlocos(blocos, soIbscbs)

    expect(blocos.map((bloco) => bloco.totalVisivel)).toEqual([4, 1, 1])
  })
})

describe('sequenciaDosBlocos', () => {
  it('segue a ordem do DOM (bloco, subgrupo, campo), diferente da ordem de entrada', () => {
    const sequencia = sequenciaDosBlocos(agruparEmBlocos(grupos))

    expect(slugs(sequencia)).toEqual([
      'codigo-servico',
      'valor-servico',
      'base-ibs',
      'aliquota-cbs',
      'cnpj-tomador',
      'inscricao-estadual',
    ])
  })

  it('monta a trilha com o rótulo do bloco e o título do subgrupo', () => {
    const sequencia = sequenciaDosBlocos(agruparEmBlocos(grupos))

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
    const sequencia = sequenciaDosBlocos(agruparEmBlocos(grupos))

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
    const filtrados = filtrarBlocos(agruparEmBlocos(grupos), (campo) =>
      ['codigo-servico', 'base-ibs', 'cnpj-tomador'].includes(campo.slug),
    )

    expect(slugs(sequenciaDosBlocos(filtrados))).toEqual([
      'codigo-servico',
      'base-ibs',
      'cnpj-tomador',
    ])
  })
})

describe('SEPARADOR_DA_TRILHA', () => {
  it('é a seta com espaços dos dois lados', () => {
    expect(SEPARADOR_DA_TRILHA).toBe(' › ')
  })
})

describe('normalizarParaBusca', () => {
  it('tira acento, passa para minúscula e apara', () => {
    expect(normalizarParaBusca('ÇÃO ')).toBe('cao')
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
