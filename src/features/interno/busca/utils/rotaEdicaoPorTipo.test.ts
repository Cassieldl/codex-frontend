import { describe, expect, it } from 'vitest'
import { nomeDaListaPorTipo, rotaEdicaoPorTipo } from './rotaEdicaoPorTipo'

describe('rotaEdicaoPorTipo — tabela de destinos (F-3)', () => {
  it('leva cada tipo com atalho à LISTAGEM interna dele, nunca ao registro', () => {
    expect(rotaEdicaoPorTipo('provedor')).toBe('/interno/provedores')
    expect(rotaEdicaoPorTipo('versaoprovedor')).toBe('/interno/provedores')
    expect(rotaEdicaoPorTipo('campolayout')).toBe('/interno/campos-layout')
    expect(rotaEdicaoPorTipo('erro')).toBe('/interno/erros')
    expect(rotaEdicaoPorTipo('artigo')).toBe('/interno/artigos')
  })

  it('nenhum destino carrega id de registro — a limitação de F-3 é estrutural', () => {
    const destinos = ['provedor', 'versaoprovedor', 'campolayout', 'erro', 'artigo'].map(
      (tipo) => rotaEdicaoPorTipo(tipo) as string,
    )

    for (const destino of destinos) {
      expect(destino).not.toMatch(/\/\d+(\/|$)/)
      expect(destino.split('/')).toHaveLength(3)
    }
  })

  it('aviso não tem atalho — vive dentro do detalhe de um provedor/versão', () => {
    expect(rotaEdicaoPorTipo('aviso')).toBeNull()
  })

  it('tipo desconhecido não inventa destino', () => {
    expect(rotaEdicaoPorTipo('comunicado')).toBeNull()
    expect(rotaEdicaoPorTipo('')).toBeNull()
  })

  it('a grafia em camelCase não é um tipo: a API envia minúsculo', () => {
    expect(rotaEdicaoPorTipo('versaoProvedor')).toBeNull()
    expect(rotaEdicaoPorTipo('campoLayout')).toBeNull()
  })

  it('nome herdado do protótipo não vira destino', () => {
    expect(rotaEdicaoPorTipo('constructor')).toBeNull()
    expect(nomeDaListaPorTipo('toString')).toBe('toString')
  })
})

describe('nomeDaListaPorTipo — frase da ressalva de PQ-09', () => {
  it('nomeia a listagem em português e no plural', () => {
    expect(nomeDaListaPorTipo('provedor')).toBe('provedores')
    expect(nomeDaListaPorTipo('versaoprovedor')).toBe('versões de provedor')
    expect(nomeDaListaPorTipo('campolayout')).toBe('campos do layout')
    expect(nomeDaListaPorTipo('erro')).toBe('erros conhecidos')
    expect(nomeDaListaPorTipo('artigo')).toBe('artigos')
    expect(nomeDaListaPorTipo('aviso')).toBe('avisos')
  })

  it('nunca devolve a chave técnica de um tipo conhecido', () => {
    expect(nomeDaListaPorTipo('versaoprovedor')).not.toBe('versaoprovedor')
    expect(nomeDaListaPorTipo('campolayout')).not.toBe('campolayout')
  })

  it('tipo desconhecido degrada para a própria chave, nunca para "null"', () => {
    expect(nomeDaListaPorTipo('comunicado')).toBe('comunicado')
  })

  it('todo tipo com rota de edição tem nome de lista — o aria-label nunca fica sem frase', () => {
    for (const tipo of ['provedor', 'versaoprovedor', 'campolayout', 'erro', 'artigo']) {
      expect(rotaEdicaoPorTipo(tipo)).not.toBeNull()
      expect(nomeDaListaPorTipo(tipo)).not.toBe(tipo)
    }
  })
})
