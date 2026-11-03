import { describe, expect, it } from 'vitest'
import {
  caminhoDeImagemSeguro,
  detectarMarcador,
  interpretarFluxo,
  reconhecerSimNao,
} from './blocosDoArtigo'

describe('detectarMarcador', () => {
  it.each([
    ['[!RESUMO]', 'resumo'],
    ['[!DICA] Use o lote.', 'dica'],
    ['[!ATENCAO]\nTexto', 'atencao'],
    ['[!IMPORTANTE]', 'importante'],
    ['[!PASSOS]', 'passos'],
    ['[!DETALHES] Tabela completa', 'detalhes'],
  ])('reconhece %s', (texto, tipo) => {
    expect(detectarMarcador(texto)?.tipo).toBe(tipo)
  })

  it('devolve o comprimento do marcador com o espaço seguinte, para o texto exibido sair sem ele', () => {
    expect(detectarMarcador('[!DICA] Use o lote.')?.comprimento).toBe('[!DICA] '.length)
  })

  it.each(['[!XYZ]', '[!dica]', 'Texto [!DICA]', '[DICA]', '[!ATENÇÃO]'])(
    'ignora %s: o blockquote continua comum',
    (texto) => {
      expect(detectarMarcador(texto)).toBeNull()
    },
  )
})

describe('caminhoDeImagemSeguro', () => {
  it('aceita imagem servida de /imagens/', () => {
    expect(caminhoDeImagemSeguro('/imagens/elotech/senha-do-webservice-elotech.png')).toBe(
      '/imagens/elotech/senha-do-webservice-elotech.png',
    )
  })

  it.each([
    'https://exemplo.com/imagens/a.png',
    'http://exemplo.com/a.png',
    'data:image/png;base64,AAAA',
    'javascript:alert(1)',
    '//exemplo.com/imagens/a.png',
    '/imagens//exemplo.com/a.png',
    '/imagens/../segredo.png',
    '/imagens/%2e%2e/segredo.png',
    '/imagens\\a.png',
    '/imagens/a.png?x=1',
    '/imagens/a.png#topo',
    '../../assets/imagens/a.png',
    'imagens/a.png',
    '/x.png',
    '/imagens/',
    '',
    undefined,
  ])('recusa %s', (src) => {
    expect(caminhoDeImagemSeguro(src)).toBeNull()
  })
})

describe('interpretarFluxo', () => {
  it('uma etapa por linha, descrição opcional e linhas em branco ignoradas', () => {
    expect(interpretarFluxo('Envio: o sistema transmite\n\n  Retorno  \nFim:')).toEqual([
      { titulo: 'Envio', descricao: 'o sistema transmite' },
      { titulo: 'Retorno' },
      { titulo: 'Fim' },
    ])
  })

  it('separa só no primeiro dois-pontos: a descrição pode ter outros', () => {
    expect(interpretarFluxo('Consulta: horário 10:30')).toEqual([
      { titulo: 'Consulta', descricao: 'horário 10:30' },
    ])
  })
})

describe('reconhecerSimNao', () => {
  it.each([
    ['Sim', 'sim'],
    [' Não ', 'nao'],
    ['Não', 'nao'],
  ])('%s vira %s', (texto, valor) => {
    expect(reconhecerSimNao(texto)).toBe(valor)
  })

  it.each(['sim', 'Sim.', 'Não se aplica', ''])('%s não é Sim/Não exato', (texto) => {
    expect(reconhecerSimNao(texto)).toBeNull()
  })
})
