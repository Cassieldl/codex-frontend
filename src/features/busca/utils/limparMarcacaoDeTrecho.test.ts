import { describe, expect, it } from 'vitest'
import type { TrechoResultado } from '../types/resultadoBusca'
import { limparMarcacaoDosTrechos } from './limparMarcacaoDeTrecho'

function trecho(texto: string, destacado = false): TrechoResultado {
  return { texto, destacado }
}

function textoFinal(trechos: readonly TrechoResultado[]): string {
  return limparMarcacaoDosTrechos(trechos)
    .map((t) => t.texto)
    .join('')
}

describe('limparMarcacaoDosTrechos', () => {
  it('remove o ## de título sem comer a palavra seguinte', () => {
    const saida = textoFinal([trecho('do provedor ## Quando você não sabe a versão')])

    expect(saida).toBe('do provedor Quando você não sabe a versão')
  })

  /**
   * O `#` só é marcação quando vem seguido de espaço. Sem esta fronteira, a limpeza comeria
   * conteúdo que a pessoa escreveu, e num portal cujo assunto é código de erro, `#` colado a
   * número é texto legítimo.
   */
  it('não mexe no # colado a número, que é conteúdo e não marcação', () => {
    const saida = textoFinal([trecho('rejeição #123 do provedor')])

    expect(saida).toBe('rejeição #123 do provedor')
  })

  it('remove a ênfase preservando o texto entre os asteriscos', () => {
    const saida = textoFinal([
      trecho('define **nome, caminho no XML e significado** de cada campo'),
    ])

    expect(saida).toBe('define nome, caminho no XML e significado de cada campo')
  })

  it('remove as crases do código inline', () => {
    const saida = textoFinal([trecho('Procure por `versao`, `version` ou `layoutVersion`')])

    expect(saida).toBe('Procure por versao, version ou layoutVersion')
  })

  it('colapsa a quebra dupla de parágrafo em um espaço só', () => {
    const saida = textoFinal([trecho('não é\n\nO Layout InvoiCy define')])

    expect(saida).toBe('não é O Layout InvoiCy define')
  })

  /**
   * O caso que obrigou a função a receber a LISTA e não cada trecho: os fragmentos são partes
   * consecutivas de uma frase só, cortadas onde o destaque começa e termina. Aparando cada um
   * isoladamente, as palavras vizinhas colam.
   */
  it('não cola as palavras vizinhas ao aparar as pontas', () => {
    const saida = textoFinal([
      trecho('Inscrição '),
      trecho('municipal', true),
      trecho(' inválida ou não cadastrada'),
    ])

    expect(saida).toBe('Inscrição municipal inválida ou não cadastrada')
  })

  it('apara o espaço nas pontas do conjunto', () => {
    const saida = textoFinal([trecho('  Inscrição '), trecho('municipal', true), trecho('  ')])

    expect(saida).toBe('Inscrição municipal')
  })

  /**
   * O caso real do negrito: o termo buscado cai DENTRO de um `**...**`, o servidor corta ali
   * para marcar o destaque, e cada fragmento fica com metade da marcação. A regra de par não
   * alcança isso: foi o teste do componente que expôs.
   */
  it('remove os asteriscos quando a ênfase fica partida entre fragmentos', () => {
    const saida = textoFinal([
      trecho('define **'),
      trecho('nome', true),
      trecho('** de cada campo'),
    ])

    expect(saida).toBe('define nome de cada campo')
  })

  /** Sublinhado solto é identificador, não marcação partida. */
  it('preserva o sublinhado dentro de identificador', () => {
    const saida = textoFinal([trecho('o campo layout_version do envelope')])

    expect(saida).toBe('o campo layout_version do envelope')
  })

  it('preserva o destaque que o servidor marcou', () => {
    const saida = limparMarcacaoDosTrechos([
      trecho('define **'),
      trecho('nome', true),
      trecho('** de cada campo'),
    ])

    expect(saida.map((t) => t.destacado)).toEqual([false, true, false])
  })

  it('devolve lista vazia sem quebrar', () => {
    expect(limparMarcacaoDosTrechos([])).toEqual([])
  })

  /** Trecho do artigo "Como funciona": o termo casou no texto e na URL do link. */
  it('tira o marcador do [!CARTOES], as barras e o link partido, mantendo o destaque', () => {
    const saida = limparMarcacaoDosTrechos([
      trecho('> [!CARTOES]\n> - **Código do erro** | Cole como veio. | [Ex.: '),
      trecho('E157', true),
      trecho('](/busca?q='),
      trecho('E157', true),
      trecho(')\n> - **Provedor** | Tudo o que está documentado.'),
    ])

    expect(saida.map((t) => t.texto).join('')).toBe(
      'Código do erro. Cole como veio. Ex.: E157 Provedor. Tudo o que está documentado.',
    )
    expect(saida.filter((t) => t.destacado).map((t) => t.texto)).toEqual(['E157'])
  })

  it('preserva o operador || de quem escreveu código', () => {
    expect(textoFinal([trecho('tpRetISSQN = 2 || 3')])).toBe('tpRetISSQN = 2 || 3')
  })
})
