import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { interpretarErroDeEscritaComunicado } from './erroDeEscritaComunicado'

function erroDaApi(status: number, code: string, message: string): AxiosError {
  const headers = new AxiosHeaders()
  return new AxiosError('request failed', 'ERR_BAD_REQUEST', { headers }, null, {
    status,
    statusText: '',
    headers,
    config: { headers },
    data: { error: { code, message } },
  })
}

describe('interpretarErroDeEscritaComunicado', () => {
  it('409 CONFLITO_CONCORRENCIA e 400 IF_MATCH_OBRIGATORIO recebem tratamentos distintos', () => {
    const conflito = interpretarErroDeEscritaComunicado(
      erroDaApi(409, 'CONFLITO_CONCORRENCIA', 'O recurso foi alterado por outra requisição.'),
    )
    const semIfMatch = interpretarErroDeEscritaComunicado(
      erroDaApi(400, 'IF_MATCH_OBRIGATORIO', 'O header If-Match é obrigatório.'),
    )

    // O ponto do teste: nenhum dos três eixos de recuperação pode coincidir.
    // Se os dois códigos caírem no mesmo tratamento, a tela deixa de distinguir
    // "alguém salvou antes de você" de "o registro veio sem validador de versão".
    expect(conflito.acao).toBe('recarregar-registro')
    expect(semIfMatch.acao).toBe('recarregar-lista')
    expect(conflito.acao).not.toBe(semIfMatch.acao)
    expect(conflito.rotuloAcao).not.toBe(semIfMatch.rotuloAcao)
    expect(conflito.orientacao).not.toBe(semIfMatch.orientacao)
    expect(conflito.orientacao).not.toBeNull()
    expect(semIfMatch.orientacao).not.toBeNull()
  })

  it('a mensagem sai do envelope do backend, nunca de texto fixo do cliente', () => {
    const mensagemDoBackend =
      'Não é possível publicar um comunicado cuja expiração já passou. Edite o comunicado para estender a data de expiração para o futuro e publique em seguida.'

    const resultado = interpretarErroDeEscritaComunicado(
      erroDaApi(422, 'COMUNICADO_EXPIRADO', mensagemDoBackend),
    )

    expect(resultado.mensagem).toBe(mensagemDoBackend)
    expect(resultado.codigo).toBe('COMUNICADO_EXPIRADO')
    // B-4: a instrução do próximo passo já está na mensagem do backend; o
    // cliente não acrescenta orientação própria para não competir com ela.
    expect(resultado.orientacao).toBeNull()
    expect(resultado.acao).toBe('editar-expiracao')
  })

  it('código desconhecido mantém a mensagem do backend e não inventa ação', () => {
    const resultado = interpretarErroDeEscritaComunicado(
      erroDaApi(422, 'VALIDACAO_NEGOCIO', 'Abrangência inconsistente com o escopo informado.'),
    )

    expect(resultado.mensagem).toBe('Abrangência inconsistente com o escopo informado.')
    expect(resultado.acao).toBeNull()
    expect(resultado.rotuloAcao).toBeNull()
    expect(resultado.orientacao).toBeNull()
  })

  it('erro fora do envelope da API cai na mensagem genérica, sem código', () => {
    const resultado = interpretarErroDeEscritaComunicado(new Error('boom'))

    expect(resultado.codigo).toBeNull()
    expect(resultado.mensagem).toBe('Ocorreu um erro inesperado.')
    expect(resultado.acao).toBeNull()
  })
})
