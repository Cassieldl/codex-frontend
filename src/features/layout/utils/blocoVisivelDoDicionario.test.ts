import { describe, expect, it } from 'vitest'
import type { BlocoDoLayout } from '../../../utils/blocosDoLayout'
import {
  contarNovosPorBloco,
  raizDoBlocoVisivel,
  vizinhosDoBloco,
} from './blocoVisivelDoDicionario'

const RAIZES = ['envio', 'rps', 'servico']

interface CampoDeTeste {
  novoNestaVersao: boolean
}

function bloco(raiz: string, novidades: boolean[][]): BlocoDoLayout<CampoDeTeste> {
  const subgrupos = novidades.map((campos, indice) => ({
    chave: `${raiz}-${String(indice)}`,
    grupoSlug: null,
    titulo: null,
    campos: campos.map((novoNestaVersao) => ({ novoNestaVersao })),
  }))
  const total = novidades.flat().length
  return { raiz, rotulo: raiz, subgrupos, totalDoBloco: total, totalVisivel: total }
}

describe('raizDoBlocoVisivel', () => {
  it('sem escolha nem campo aberto, mostra o primeiro bloco', () => {
    expect(raizDoBlocoVisivel(RAIZES, null, null)).toBe('envio')
  })

  it('o campo aberto no modal manda sobre o bloco escolhido na lateral', () => {
    expect(raizDoBlocoVisivel(RAIZES, 'rps', null)).toBe('rps')
    expect(raizDoBlocoVisivel(RAIZES, 'rps', 'servico')).toBe('servico')
  })

  it('escolha que não existe mais cai no primeiro; lista vazia não mostra nada', () => {
    expect(raizDoBlocoVisivel(RAIZES, 'sumiu', 'outro')).toBe('envio')
    expect(raizDoBlocoVisivel([], 'rps', null)).toBeNull()
  })
})

describe('vizinhosDoBloco', () => {
  it('o do meio tem anterior e próximo; as pontas, só um lado', () => {
    expect(vizinhosDoBloco(RAIZES, 'rps')).toEqual({ anterior: 'envio', proximo: 'servico' })
    expect(vizinhosDoBloco(RAIZES, 'envio')).toEqual({ anterior: null, proximo: 'rps' })
    expect(vizinhosDoBloco(RAIZES, 'servico')).toEqual({ anterior: 'rps', proximo: null })
  })

  it('bloco fora da lista não tem vizinho', () => {
    expect(vizinhosDoBloco(RAIZES, null)).toEqual({ anterior: null, proximo: null })
  })
})

describe('contarNovosPorBloco', () => {
  it('soma os campos novos de todos os subgrupos de cada bloco', () => {
    const novos = contarNovosPorBloco([
      bloco('envio', [[false, false]]),
      bloco('servico', [
        [true, false],
        [true, true, false],
      ]),
    ])

    expect(novos.get('envio')).toBe(0)
    expect(novos.get('servico')).toBe(3)
  })
})
