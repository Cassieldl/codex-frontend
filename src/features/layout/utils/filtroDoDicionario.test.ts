import { describe, expect, it } from 'vitest'
import { campoPassaNoDicionario, filtroDoDicionarioAtivo } from './filtroDoDicionario'

// Cada termo de busca aparece em UM só dos três textos: o teste de cada coluna só passa se a coluna
// entra no predicado. O significado traz acento e caixa mista de propósito.
const CAMPO = {
  slug: 'grupo-nomeunico',
  nome: 'NomeUnico',
  caminhoXml: '//Grupo/CaminhoUnico',
  significado: 'Mês de Competência do serviço.',
  ordem: 10,
  reformaTributaria: false,
  novoNestaVersao: false,
  descontinuadoNestaVersao: false,
  urlCanonica: '/layout/campos/grupo-nomeunico',
}

function busca(termo: string) {
  return { termo, somenteReformaTributaria: false, somenteNovos: false }
}

describe('campoPassaNoDicionario', () => {
  it('acha pelo nome', () => {
    expect(campoPassaNoDicionario(CAMPO, busca('nomeunico'))).toBe(true)
  })

  it('acha pelo caminho no XML', () => {
    expect(campoPassaNoDicionario(CAMPO, busca('caminhounico'))).toBe(true)
  })

  it('acha só pelo significado, a coluna que a tabela do provedor não tem', () => {
    expect(campoPassaNoDicionario(CAMPO, busca('do serviço'))).toBe(true)
  })

  it('ignora acento e caixa nos dois lados', () => {
    expect(campoPassaNoDicionario(CAMPO, busca('COMPETENCIA'))).toBe(true)
    expect(campoPassaNoDicionario(CAMPO, busca('mês'))).toBe(true)
    expect(campoPassaNoDicionario(CAMPO, busca('MES DE'))).toBe(true)
  })

  it('não acha o que não está em nenhum dos três textos', () => {
    expect(campoPassaNoDicionario(CAMPO, busca('zzz-inexistente'))).toBe(false)
  })

  it('termo vazio ou só espaços passa tudo', () => {
    expect(campoPassaNoDicionario(CAMPO, busca(''))).toBe(true)
    expect(campoPassaNoDicionario(CAMPO, busca('   '))).toBe(true)
  })

  it('ignora espaços nas pontas do termo', () => {
    expect(campoPassaNoDicionario(CAMPO, busca('  nomeunico  '))).toBe(true)
  })

  it('campo sem significado ainda é achado por nome e caminho', () => {
    const semSignificado = { ...CAMPO, significado: '' }

    expect(campoPassaNoDicionario(semSignificado, busca('nomeunico'))).toBe(true)
    expect(campoPassaNoDicionario(semSignificado, busca('competencia'))).toBe(false)
  })

  it('só campos da reforma: barra o campo de fora dela e ainda aplica o termo ao da reforma', () => {
    const daReforma = { ...CAMPO, reformaTributaria: true }
    const soReforma = (termo: string) => ({
      termo,
      somenteReformaTributaria: true,
      somenteNovos: false,
    })

    expect(campoPassaNoDicionario(CAMPO, soReforma(''))).toBe(false)
    expect(campoPassaNoDicionario(daReforma, soReforma(''))).toBe(true)
    expect(campoPassaNoDicionario(daReforma, soReforma('nomeunico'))).toBe(true)
    expect(campoPassaNoDicionario(daReforma, soReforma('zzz-inexistente'))).toBe(false)
  })

  it('só o que mudou: barra o campo que já existia e ainda aplica o termo ao novo', () => {
    const novo = { ...CAMPO, novoNestaVersao: true }
    const soNovos = (termo: string) => ({
      termo,
      somenteReformaTributaria: false,
      somenteNovos: true,
    })

    expect(campoPassaNoDicionario(CAMPO, soNovos(''))).toBe(false)
    expect(campoPassaNoDicionario(novo, soNovos(''))).toBe(true)
    expect(campoPassaNoDicionario(novo, soNovos('nomeunico'))).toBe(true)
    expect(campoPassaNoDicionario(novo, soNovos('zzz-inexistente'))).toBe(false)
  })

  it('só o que mudou junto com a reforma: passa só o campo novo e da reforma', () => {
    const filtro = { termo: '', somenteReformaTributaria: true, somenteNovos: true }

    expect(campoPassaNoDicionario({ ...CAMPO, novoNestaVersao: true }, filtro)).toBe(false)
    expect(campoPassaNoDicionario({ ...CAMPO, reformaTributaria: true }, filtro)).toBe(false)
    expect(
      campoPassaNoDicionario({ ...CAMPO, novoNestaVersao: true, reformaTributaria: true }, filtro),
    ).toBe(true)
  })
})

describe('filtroDoDicionarioAtivo', () => {
  it('só o que mudou conta como filtro ativo, mesmo sem termo', () => {
    const semFiltro = { termo: ' ', somenteReformaTributaria: false, somenteNovos: false }

    expect(filtroDoDicionarioAtivo(semFiltro)).toBe(false)
    expect(filtroDoDicionarioAtivo({ ...semFiltro, somenteNovos: true })).toBe(true)
  })
})
