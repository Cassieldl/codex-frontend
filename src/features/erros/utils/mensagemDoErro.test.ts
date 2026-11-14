import { describe, expect, it } from 'vitest'
import { resolverMensagemDoErro } from './mensagemDoErro'

// Transcrito de GET /api/v1/erros/e0621-... no banco local (Emissor Nacional 0.20).
const MENSAGEM_INTEIRA_E0621 =
  'É obrigatório informar alíquota quando há indicação de retenção do ISSQN (tpRetISSQN = 2 ou 3) para o prestador de serviço ME/EPP (opSimpNac = 3) na data de competência informada na DPS, com apuração do ISSQN pelo simples nacional (regApTribISSQN = 1), sem benefício municipal ou, se houver, seja diferente de isenção ou alíquota diferenciada, cujo município de incidência esteja Ativo no Sistema Nacional NFS-e. Obs: neste cenário, o percentual da alíquota mínima informada permitida é 1,8%.'

const E0621 = {
  titulo:
    'É obrigatório informar alíquota quando há indicação de retenção do ISSQN (tpRetISSQN = 2 ou 3) para o prestador de serviço ME/EPP (opSimpNac = 3) na data de…',
  variantes: [MENSAGEM_INTEIRA_E0621],
}

describe('resolverMensagemDoErro', () => {
  it('título cortado com "…": a mensagem observada que começa igual vai inteira para o topo e sai da lista', () => {
    expect(resolverMensagemDoErro(E0621)).toEqual({
      principal: MENSAGEM_INTEIRA_E0621,
      outras: [],
    })
  })

  it('título cortado mantém na lista a mensagem que diz outra coisa', () => {
    const outra = 'Alíquota ausente para prestador do Simples Nacional.'

    expect(
      resolverMensagemDoErro({ ...E0621, variantes: [outra, MENSAGEM_INTEIRA_E0621] }),
    ).toEqual({ principal: MENSAGEM_INTEIRA_E0621, outras: [outra] })
  })

  it('título cortado sem mensagem que comece igual fica como está', () => {
    const outra = 'Alíquota ausente para prestador do Simples Nacional.'

    expect(resolverMensagemDoErro({ ...E0621, variantes: [outra] })).toEqual({
      principal: E0621.titulo,
      outras: [outra],
    })
  })

  it('título inteiro: só sai a mensagem igual a ele, com ou sem ponto final', () => {
    const titulo = 'Usuário não tem autorização para solicitar o serviço.'
    const outra = 'Contribuinte sem liberação na prefeitura.'

    expect(
      resolverMensagemDoErro({
        titulo,
        variantes: ['Usuário não tem autorização para solicitar o serviço', outra],
      }),
    ).toEqual({ principal: titulo, outras: [outra] })
  })
})
