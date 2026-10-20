import { describe, expect, it } from 'vitest'

import { formatarVersaoLayout } from './versaoDoLayout'

describe('formatarVersaoLayout', () => {
  it('prefixa o número com "versão"', () => {
    expect(formatarVersaoLayout('8')).toBe('versão 8')
    expect(formatarVersaoLayout('4.12')).toBe('versão 4.12')
  })

  it('usa "Versão" com maiúscula quando pedido', () => {
    expect(formatarVersaoLayout('8', { maiuscula: true })).toBe('Versão 8')
  })

  it('não repete a palavra quando o rótulo já a traz, em qualquer caixa', () => {
    expect(formatarVersaoLayout('Versão 8')).toBe('versão 8')
    expect(formatarVersaoLayout('versao 8')).toBe('versão 8')
    expect(formatarVersaoLayout('VERSÃO 8')).toBe('versão 8')
    expect(formatarVersaoLayout('Versão 4.12', { maiuscula: true })).toBe('Versão 4.12')
  })

  it('apara os espaços das pontas', () => {
    expect(formatarVersaoLayout('  8  ')).toBe('versão 8')
    expect(formatarVersaoLayout('  Versão   8 ')).toBe('versão 8')
  })

  it('não inventa prefixo sem número', () => {
    expect(formatarVersaoLayout('')).toBe('')
    expect(formatarVersaoLayout('   ')).toBe('')
    expect(formatarVersaoLayout('Versão')).toBe('')
  })
})

/**
 * Texto de versão do layout tem dono: depois de "Layout InvoiCy" só entra `formatarVersaoLayout(…)`.
 * O rótulo cru ("8") imprimiria "Layout InvoiCy 8", e um rótulo que já traz a palavra imprimiria
 * "versão versão". A varredura cobre as três formas de montar o texto — JSX, template e
 * concatenação —, porque cada uma passa despercebida pelas regexes das outras.
 */
const DEPOIS_DE_LAYOUT_INVOICY =
  /Layout InvoiCy(?:\s|\{\s*(['"`])\s*\1\s*\})*(?:\$?\{|['"`]\s*\+)\s*([\s\S]{0,40})/g

const VERSAO_ANTES_DO_HELPER = /vers[aã]o\s*(?:\$?\{|['"`]\s*\+)\s*formatarVersaoLayout\(/i

function acharInterpolacaoCruaDepoisDeLayoutInvoicy(fonte: string): string[] {
  return [...fonte.matchAll(DEPOIS_DE_LAYOUT_INVOICY)]
    .filter(([, , expressao]) => !expressao.startsWith('formatarVersaoLayout('))
    .map(([trecho]) => trecho)
}

function acharVersaoDuplicada(fonte: string): string[] {
  return [...fonte.matchAll(new RegExp(VERSAO_ANTES_DO_HELPER, 'gi'))].map(([trecho]) => trecho)
}

describe('detector de versão do layout montada à mão', () => {
  const FORMAS_CRUAS: Record<string, string> = {
    JSX: '<h1>Layout InvoiCy {pagina.versao.rotulo}</h1>',
    'JSX com espaço explícito': "<h1>Layout InvoiCy{' '}{pagina.versao.rotulo}</h1>",
    'JSX com quebra de linha': '<h1>\n  Layout InvoiCy\n  {pagina.versao.rotulo}\n</h1>',
    'JSX em expressão': '{rotulo ? <b>Layout InvoiCy {rotulo}</b> : null}',
    template: 'const t = `Campos do Layout InvoiCy ${rotuloDaVersao}`',
    'concatenação com aspas simples': "const t = 'Layout InvoiCy ' + rotulo",
    'concatenação com aspas duplas': 'const t = "Layout InvoiCy " + rotulo',
    'concatenação sem espaço antes do +': "const t = 'Layout InvoiCy '+rotulo",
  }

  it.each(Object.entries(FORMAS_CRUAS))('acusa %s', (_forma, fonte) => {
    expect(acharInterpolacaoCruaDepoisDeLayoutInvoicy(fonte)).toHaveLength(1)
  })

  const FORMAS_CORRETAS: Record<string, string> = {
    JSX: '<h1>Layout InvoiCy {formatarVersaoLayout(pagina.versao.rotulo)}</h1>',
    'JSX com espaço explícito': "<h1>Layout InvoiCy{' '}{formatarVersaoLayout(rotulo)}</h1>",
    template: 'const t = `do Layout InvoiCy ${formatarVersaoLayout(rotulo)}`',
    concatenação: "const t = 'Layout InvoiCy ' + formatarVersaoLayout(rotulo)",
    'texto sem interpolação': '<h1>Layout InvoiCy</h1>',
    'texto seguido de outro elemento': '<h1>Layout InvoiCy</h1>{filhos}',
    'literal entre aspas': "const t = 'Nova versão do Layout InvoiCy'",
    'ternário depois do literal': "x ? 'Layout InvoiCy' : 'Outro'",
  }

  it.each(Object.entries(FORMAS_CORRETAS))('aceita %s', (_forma, fonte) => {
    expect(acharInterpolacaoCruaDepoisDeLayoutInvoicy(fonte)).toEqual([])
  })

  it('acusa "versão" escrita antes do helper, que repetiria a palavra', () => {
    expect(acharVersaoDuplicada('<p>versão {formatarVersaoLayout(rotulo)}</p>')).toHaveLength(1)
    expect(acharVersaoDuplicada('`Versão ${formatarVersaoLayout(rotulo)}`')).toHaveLength(1)
    expect(acharVersaoDuplicada("'versão ' + formatarVersaoLayout(rotulo)")).toHaveLength(1)
    expect(acharVersaoDuplicada('<p>da versão {rotulo}</p>')).toEqual([])
    expect(acharVersaoDuplicada('<p>{formatarVersaoLayout(rotulo)}</p>')).toEqual([])
  })
})

describe('o código de produção não monta versão do layout à mão', () => {
  const FONTES = import.meta.glob('../**/*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  })

  const arquivosDeProducao = Object.keys(FONTES).filter((caminho) => !caminho.endsWith('.test.tsx'))

  it('a varredura enxerga o universo e o texto de verdade', () => {
    // Sem contar o universo, um glob que parasse de casar deixaria os casos abaixo passarem por
    // vazio. São ~144 arquivos de produção; o piso tolera remoções.
    expect(arquivosDeProducao.length).toBeGreaterThanOrEqual(130)
    expect(arquivosDeProducao.some((caminho) => caminho.includes('/features/layout/'))).toBe(true)

    const mencoes = arquivosDeProducao.reduce(
      (soma, caminho) => soma + (FONTES[caminho].match(/Layout InvoiCy/g)?.length ?? 0),
      0,
    )
    expect(mencoes).toBeGreaterThanOrEqual(20)
  })

  it('depois de "Layout InvoiCy" só entra formatarVersaoLayout', () => {
    const montagensCrus = arquivosDeProducao.filter(
      (caminho) => acharInterpolacaoCruaDepoisDeLayoutInvoicy(FONTES[caminho]).length > 0,
    )

    expect(montagensCrus).toEqual([])
  })

  it('"versão" não vem escrita antes de formatarVersaoLayout', () => {
    const duplicadas = arquivosDeProducao.filter(
      (caminho) => acharVersaoDuplicada(FONTES[caminho]).length > 0,
    )

    expect(duplicadas).toEqual([])
  })
})
