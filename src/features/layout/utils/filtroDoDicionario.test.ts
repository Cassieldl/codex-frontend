import { describe, expect, it } from 'vitest'
import { campoPassaNoDicionario } from './filtroDoDicionario'

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
  return { termo, somenteReformaTributaria: false }
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
    const soReforma = (termo: string) => ({ termo, somenteReformaTributaria: true })

    expect(campoPassaNoDicionario(CAMPO, soReforma(''))).toBe(false)
    expect(campoPassaNoDicionario(daReforma, soReforma(''))).toBe(true)
    expect(campoPassaNoDicionario(daReforma, soReforma('nomeunico'))).toBe(true)
    expect(campoPassaNoDicionario(daReforma, soReforma('zzz-inexistente'))).toBe(false)
  })
})
