import { describe, expect, it } from 'vitest'
import type { NoEstrutura } from '../types/estruturaLayout'
import { montarLinhasDaEstrutura, serializarEstrutura } from './linhasDaEstrutura'

function no(nome: string, extras: Partial<NoEstrutura> = {}): NoEstrutura {
  return {
    nome,
    caminho: nome,
    ehGrupo: (extras.filhos?.length ?? 0) > 0,
    repete: false,
    escolha: false,
    valorModelo: null,
    campoSlug: null,
    formato: 'ambos',
    filhos: [],
    ...extras,
  }
}

const rpsXml = no('RPS', {
  repete: true,
  filhos: [
    no('Identificacao', {
      filhos: [no('Numero', { valorModelo: '0', campoSlug: 'numero-do-rps' })],
    }),
    no('ValorServicos', { valorModelo: '0.00' }),
  ],
})

const envio = no('Envio', {
  filhos: [no('ModeloDocumento', { valorModelo: 'texto(10)' }), rpsXml],
})

const documento = no('Documento', {
  filhos: [
    no('ModeloDocumento', { valorModelo: 'texto(10)' }),
    no('RPS', {
      repete: true,
      filhos: [
        no('Identificacao', { filhos: [no('Numero', { valorModelo: '0' })] }),
        no('ValorServicos', { valorModelo: '0.00' }),
        no('Datas', { repete: true, valorModelo: 'AAAA-MM-DD' }),
      ],
    }),
  ],
})

describe('serializarEstrutura', () => {
  it('XML: aninha os grupos e mostra a tag que repete uma vez só', () => {
    expect(serializarEstrutura(envio, 'xml')).toBe(
      [
        '<Envio>',
        '  <ModeloDocumento>texto(10)</ModeloDocumento>',
        '  <RPS>',
        '    <Identificacao>',
        '      <Numero>0</Numero>',
        '    </Identificacao>',
        '    <ValorServicos>0.00</ValorServicos>',
        '  </RPS>',
        '</Envio>',
        '',
      ].join('\n'),
    )
  })

  it('JSON: raiz dentro de array, repete vira array com um exemplo e número sai sem aspas', () => {
    const texto = serializarEstrutura(documento, 'json')

    expect(texto).toBe(
      [
        '[',
        '  {',
        '    "Documento": {',
        '      "ModeloDocumento": "texto(10)",',
        '      "RPS": [',
        '        {',
        '          "Identificacao": {',
        '            "Numero": 0',
        '          },',
        '          "ValorServicos": 0.00,',
        '          "Datas": ["AAAA-MM-DD"]',
        '        }',
        '      ]',
        '    }',
        '  }',
        ']',
        '',
      ].join('\n'),
    )

    const envioRest = JSON.parse(texto) as [{ Documento: { RPS: unknown[] } }]
    expect(envioRest[0].Documento.RPS).toHaveLength(1)
  })
})

describe('montarLinhasDaEstrutura', () => {
  it('registra a 1ª linha da tag e os grupos que a contêm, para a âncora abri-los', () => {
    const { linhas, ancoras } = montarLinhasDaEstrutura(envio, 'xml')

    const ancora = ancoras.get('numero-do-rps')
    expect(ancora).toEqual({ linha: 4, grupos: [0, 2, 3] })
    expect(ancora?.grupos.map((indice) => linhas[indice].no?.nome)).toEqual([
      'Envio',
      'RPS',
      'Identificacao',
    ])
  })
})
