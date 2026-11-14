import { describe, expect, it } from 'vitest'
import { resolverTituloDoCartao, trechosQueAcrescentam } from './trechoAcrescenta'

// Itens transcritos de GET /api/v1/busca?q=E157 e ?q=aliquota&tipo=erro no banco local.
const E157_GISS = {
  chave: 'E157',
  titulo: 'Usuário não tem autorização para solicitar o serviço.',
  solucaoResumo:
    'A pessoa física ou jurídica, identificada pelo CPF ou CNPJ, não está autorizada a solicitar o serviço para o contribuinte identificado pelo CPF ou CNPJ.',
  trechos: [
    { texto: 'E157', destacado: true },
    {
      texto:
        ' Usuário não tem autorização para solicitar o serviço. Usuário não tem autorização para solicitar o serviço. A pessoa física ou jurídica, identificada pelo CPF ou CNPJ, não está autorizada a solicitar o serviço',
      destacado: false,
    },
  ],
}

const E157_ISSNET = {
  chave: 'E157',
  titulo: 'Usuário não está autorizado a utilizar esse serviço para esse contribuinte.',
  solucaoResumo:
    'Pedir liberação à Nota Control (homologação paga; produção por e-mail a suporte@notaeletronica.com.br).',
  trechos: [
    { texto: 'E157', destacado: true },
    {
      texto:
        ' Usuário não está autorizado a utilizar esse serviço para esse contribuinte. Usuário não está autorizado a utilizar esse serviço para esse contribuinte. Pedir liberação à Nota Control (homologação paga; produção por e-mail',
      destacado: false,
    },
  ],
}

const E1557 = {
  chave: 'E1557',
  titulo: 'Percentual redutor de alíquota para o IBS estadual incorreto.',
  solucaoResumo: null,
  trechos: [
    { texto: 'E1557 Percentual redutor de ', destacado: false },
    { texto: 'alíquota', destacado: true },
    { texto: ' para o IBS estadual incorreto. Percentual redutor de ', destacado: false },
    { texto: 'alíquota', destacado: true },
    {
      texto: ' para o IBS estadual incorreto. Regra da Sefin: O percentual redutor de ',
      destacado: false,
    },
    { texto: 'alíquota', destacado: true },
    { texto: ' para o IBS estadual deve', destacado: false },
  ],
}

const E1577 = {
  chave: 'E1577',
  titulo: 'Alíquota efetiva da UF para IBS incorreta.',
  solucaoResumo: null,
  trechos: [
    { texto: 'E1577 ', destacado: false },
    { texto: 'Alíquota', destacado: true },
    { texto: ' efetiva da UF para IBS incorreta. ', destacado: false },
    { texto: 'Alíquota', destacado: true },
    { texto: ' efetiva da UF para IBS incorreta. Regra da Sefin: A ', destacado: false },
    { texto: 'alíquota', destacado: true },
    {
      texto:
        ' efetiva da UF para IBS deve ser igual ao valor IBSCBS/gIBSCBS/gIBSUF/gRed/pAliqEfet retornado',
      destacado: false,
    },
  ],
}

function doCartao(item: typeof E157_GISS | typeof E1557) {
  return trechosQueAcrescentam(item.trechos, [item.titulo, item.chave, item.solucaoResumo])
}

function textoDe(trechos: { texto: string }[]) {
  return trechos.map((trecho) => trecho.texto).join('')
}

describe('trechosQueAcrescentam', () => {
  it('E157: o trecho só repete código, mensagem e solução que o cartão já mostra, então sai inteiro', () => {
    expect(doCartao(E157_GISS)).toEqual([])
    expect(doCartao(E157_ISSNET)).toEqual([])
  })

  it('sem a solução entre os textos já mostrados, a solução volta a aparecer, uma vez só', () => {
    const trechos = trechosQueAcrescentam(E157_ISSNET.trechos, [E157_ISSNET.titulo, 'E157'])

    expect(textoDe(trechos)).toBe(
      'Pedir liberação à Nota Control (homologação paga; produção por e-mail',
    )
  })

  it('E1557: tira a mensagem repetida e deixa só a regra da Sefin, com o termo destacado', () => {
    const trechos = doCartao(E1557)

    expect(textoDe(trechos)).toBe(
      'Regra da Sefin: O percentual redutor de alíquota para o IBS estadual deve',
    )
    expect(trechos.filter((trecho) => trecho.destacado).map((trecho) => trecho.texto)).toEqual([
      'alíquota',
    ])
  })

  it('E1577: a mensagem não aparece no trecho e a regra aparece uma vez', () => {
    const texto = textoDe(doCartao(E1577))

    expect(texto).not.toContain('incorreta')
    expect(texto.match(/Regra da Sefin/g)).toHaveLength(1)
  })

  it('frase repetida dentro do próprio trecho aparece uma vez', () => {
    const trechos = trechosQueAcrescentam(
      [{ texto: 'Use a série 8. Use a série 8. Outras falham.', destacado: false }],
      ['Homologação'],
    )

    expect(textoDe(trechos)).toBe('Use a série 8. Outras falham.')
  })
})

// Também de GET /api/v1/busca?q=aliquota&tipo=erro: título cortado em "…" e "Regra da Sefin:".
const E0621 = {
  chave: 'E0621',
  titulo:
    'É obrigatório informar alíquota quando há indicação de retenção do ISSQN (tpRetISSQN = 2 ou 3) para o prestador de serviço ME/EPP (opSimpNac = 3) na data de…',
  solucaoResumo: null,
  trechos: [
    { texto: 'E0621 É obrigatório informar ', destacado: false },
    { texto: 'alíquota', destacado: true },
    {
      texto:
        ' quando há indicação de retenção do ISSQN (tpRetISSQN = 2 ou 3) para o prestador de serviço ME/EPP (opSimpNac = 3) na data de competência informada na DPS, com apuração',
      destacado: false,
    },
  ],
}

const E0625 = {
  chave: 'E0625',
  titulo:
    'Não é permitido informar alíquota quando não há indicação de retenção do ISSQN (tpRetISSQN = 1) para o prestador de serviço ME/EPP (opSimpNac = 3) na data de…',
  solucaoResumo: null,
  trechos: [
    { texto: 'E0625 Não é permitido informar ', destacado: false },
    { texto: 'alíquota', destacado: true },
    {
      texto:
        ' quando não há indicação de retenção do ISSQN (tpRetISSQN = 1) para o prestador de serviço ME/EPP (opSimpNac = 3) na data de competência informada na DPS, com apuração',
      destacado: false,
    },
  ],
}

const E1300 = {
  chave: 'E1300',
  titulo: 'Não é permitido informar alíquota aplicada superior a 5%.',
  solucaoResumo: null,
  trechos: [
    { texto: 'E1300 Não é permitido informar ', destacado: false },
    { texto: 'alíquota', destacado: true },
    { texto: ' aplicada superior a 5%. Não é permitido informar ', destacado: false },
    { texto: 'alíquota', destacado: true },
    {
      texto: ' aplicada superior a 5%. Regra da Sefin: Não é permitido informar ',
      destacado: false,
    },
    { texto: 'alíquota', destacado: true },
    { texto: ' aplicada superior a 5%.\nOnde', destacado: false },
  ],
}

describe('resolverTituloDoCartao', () => {
  it.each([
    ['E0621', E0621, 'É obrigatório informar alíquota quando há indicação de retenção'],
    ['E0625', E0625, 'Não é permitido informar alíquota quando não há indicação de retenção'],
  ])(
    '%s: a frase mais longa do trecho vira o título, com o termo destacado, e o trecho fica vazio',
    (_, item, inicio) => {
      const resolvido = resolverTituloDoCartao(item.titulo, item.chave, item.trechos)
      const titulo = textoDe(resolvido.titulo)

      expect(resolvido.veioDoTrecho).toBe(true)
      expect(titulo.startsWith(inicio)).toBe(true)
      expect(titulo.endsWith('na data de competência informada na DPS, com apuração…')).toBe(true)
      expect(titulo).not.toContain(item.chave)
      expect(
        resolvido.titulo.filter((parte) => parte.destacado).map((parte) => parte.texto),
      ).toEqual(['alíquota'])
      expect(trechosQueAcrescentam(resolvido.trechos, [titulo, item.chave])).toEqual([])
    },
  )

  it('título inteiro fica como veio, e o trecho também', () => {
    const resolvido = resolverTituloDoCartao(E1300.titulo, E1300.chave, E1300.trechos)

    expect(resolvido).toEqual({
      titulo: [{ texto: E1300.titulo, destacado: false }],
      trechos: E1300.trechos,
      veioDoTrecho: false,
    })
  })

  it('título cortado sem frase do trecho que comece igual fica como veio', () => {
    const titulo = 'Mensagem que o trecho não traz…'
    const trechos = [{ texto: 'Outra coisa inteira.', destacado: false }]

    expect(resolverTituloDoCartao(titulo, null, trechos).veioDoTrecho).toBe(false)
  })
})

describe('trechosQueAcrescentam: rótulo na frente da mensagem e sobra cortada', () => {
  it('E1300: "Regra da Sefin:" seguido da mensagem e a palavra solta do fim saem', () => {
    expect(doCartao(E1300)).toEqual([])
  })

  it('a frase que repete o título e acrescenta mais do que um rótulo curto fica', () => {
    const titulo = 'Não é permitido informar alíquota aplicada superior a 5%.'
    const trechos = [
      {
        texto:
          'Regra da Sefin: Não é permitido informar alíquota aplicada superior a 5% quando o município não tem convênio ativo.',
        destacado: false,
      },
    ]

    expect(trechosQueAcrescentam(trechos, [titulo])).toHaveLength(1)
  })
})

describe('resolverTituloDoCartao: título inteiro', () => {
  // E1570 e E165, também de q=aliquota&tipo=erro.
  const E1570 = {
    chave: 'E1570',
    titulo: 'Valor do diferimento para o IBS municipal deve ser informado.',
    trechos: [
      {
        texto:
          'valor do diferimento para o IBS municipal deve ser informado se foi informada, na DPS, a ',
        destacado: false,
      },
      { texto: 'alíquota', destacado: true },
      {
        texto:
          ' para o diferimento do IBS municipal - pDifMun.\nOnde: NFSe/infNFSe/IBSCBS/totCIBS/gIBS/gIBSMunTot/vDifMun\nValor calculado pela Sefin ao gerar',
        destacado: false,
      },
    ],
  }

  const E165 = {
    chave: 'E165',
    titulo: 'Alíquota do serviço inválida',
    solucaoResumo: 'Consulte o manual da NFS-e para verificar o formato e o tamanho do campo.',
    trechos: [
      { texto: 'E165 ', destacado: false },
      { texto: 'Alíquota', destacado: true },
      { texto: ' do serviço inválida ', destacado: false },
      { texto: 'Alíquota', destacado: true },
      {
        texto:
          ' do serviço inválida Consulte o manual da NFS-e para verificar o formato e o tamanho do campo',
        destacado: false,
      },
    ],
  }

  it('E1570: a frase que continua o título com uma condição vira o título, com a inicial dele', () => {
    const resolvido = resolverTituloDoCartao(E1570.titulo, E1570.chave, E1570.trechos)
    const titulo = textoDe(resolvido.titulo)

    expect(titulo).toBe(
      'Valor do diferimento para o IBS municipal deve ser informado se foi informada, na DPS, a alíquota para o diferimento do IBS municipal - pDifMun.',
    )
    expect(textoDe(trechosQueAcrescentam(resolvido.trechos, [titulo, E1570.chave]))).toBe(
      'Onde: NFSe/infNFSe/IBSCBS/totCIBS/gIBS/gIBSMunTot/vDifMun Valor calculado pela Sefin ao gerar',
    )
  })

  it('E165: título sem ponto colado na própria repetição e na solução não vira título, e o trecho sai', () => {
    const outros = [E165.chave, E165.solucaoResumo]
    const resolvido = resolverTituloDoCartao(E165.titulo, E165.chave, E165.trechos, outros)

    expect(resolvido.veioDoTrecho).toBe(false)
    expect(trechosQueAcrescentam(resolvido.trechos, [E165.titulo, ...outros])).toEqual([])
  })
})
