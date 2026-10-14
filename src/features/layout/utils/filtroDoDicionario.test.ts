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
  novoNestaVersao: false,
  descontinuadoNestaVersao: false,
  urlCanonica: '/layout/campos/grupo-nomeunico',
}

describe('campoPassaNoDicionario', () => {
  it('acha pelo nome', () => {
    expect(campoPassaNoDicionario(CAMPO, 'nomeunico')).toBe(true)
  })

  it('acha pelo caminho no XML', () => {
    expect(campoPassaNoDicionario(CAMPO, 'caminhounico')).toBe(true)
  })

  it('acha só pelo significado, a coluna que a tabela do provedor não tem', () => {
    expect(campoPassaNoDicionario(CAMPO, 'do serviço')).toBe(true)
  })

  it('ignora acento e caixa nos dois lados', () => {
    expect(campoPassaNoDicionario(CAMPO, 'COMPETENCIA')).toBe(true)
    expect(campoPassaNoDicionario(CAMPO, 'mês')).toBe(true)
    expect(campoPassaNoDicionario(CAMPO, 'MES DE')).toBe(true)
  })

  it('não acha o que não está em nenhum dos três textos', () => {
    expect(campoPassaNoDicionario(CAMPO, 'zzz-inexistente')).toBe(false)
  })

  it('termo vazio ou só espaços passa tudo', () => {
    expect(campoPassaNoDicionario(CAMPO, '')).toBe(true)
    expect(campoPassaNoDicionario(CAMPO, '   ')).toBe(true)
  })

  it('ignora espaços nas pontas do termo', () => {
    expect(campoPassaNoDicionario(CAMPO, '  nomeunico  ')).toBe(true)
  })

  it('campo sem significado ainda é achado por nome e caminho', () => {
    const semSignificado = { ...CAMPO, significado: '' }

    expect(campoPassaNoDicionario(semSignificado, 'nomeunico')).toBe(true)
    expect(campoPassaNoDicionario(semSignificado, 'competencia')).toBe(false)
  })
})
