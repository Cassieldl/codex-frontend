import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { interpretarErroDeEscritaArtigo } from './erroDeEscritaArtigo'

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

describe('interpretarErroDeEscritaArtigo', () => {
  it('409 CONFLITO_CONCORRENCIA e 400 IF_MATCH_OBRIGATORIO recebem tratamentos distintos', () => {
    const conflito = interpretarErroDeEscritaArtigo(
      erroDaApi(409, 'CONFLITO_CONCORRENCIA', 'O recurso foi alterado por outra requisição.'),
    )
    const semIfMatch = interpretarErroDeEscritaArtigo(
      erroDaApi(400, 'IF_MATCH_OBRIGATORIO', 'O header If-Match é obrigatório.'),
    )

    // Se os dois códigos caírem no mesmo tratamento, a tela deixa de distinguir
    // "alguém salvou antes de você" de "o registro veio sem validador de versão".
    expect(conflito.acao).toBe('recarregar-registro')
    expect(semIfMatch.acao).toBe('recarregar-lista')
    expect(conflito.rotuloAcao).not.toBe(semIfMatch.rotuloAcao)
    expect(conflito.orientacao).not.toBe(semIfMatch.orientacao)
  })

  it('422 ARTIGO_RESERVADO explica a reserva e não oferece ação - nenhum gesto faz a remoção passar', () => {
    const mensagemDoBackend =
      'O artigo "como-funciona" é obrigatório e não pode ser removido nem despublicado.'

    const resultado = interpretarErroDeEscritaArtigo(
      erroDaApi(422, 'ARTIGO_RESERVADO', mensagemDoBackend),
    )

    expect(resultado.codigo).toBe('ARTIGO_RESERVADO')
    expect(resultado.mensagem).toBe(mensagemDoBackend)
    expect(resultado.orientacao).not.toBeNull()
    expect(resultado.acao).toBeNull()
    expect(resultado.rotuloAcao).toBeNull()
  })

  it('a mensagem sai do envelope do backend, nunca de texto fixo do cliente', () => {
    const resultado = interpretarErroDeEscritaArtigo(
      erroDaApi(422, 'VALIDACAO_NEGOCIO', 'Já existe um artigo com este título.'),
    )

    expect(resultado.mensagem).toBe('Já existe um artigo com este título.')
    // Código sem tabela de recuperação: mostra a mensagem e para por aí.
    expect(resultado.acao).toBeNull()
    expect(resultado.orientacao).toBeNull()
  })

  it('erro fora do envelope da API não inventa código nem orientação', () => {
    const resultado = interpretarErroDeEscritaArtigo(new Error('falha de rede'))

    expect(resultado.codigo).toBeNull()
    expect(resultado.mensagem).toBe('Ocorreu um erro inesperado.')
    expect(resultado.acao).toBeNull()
  })
})
