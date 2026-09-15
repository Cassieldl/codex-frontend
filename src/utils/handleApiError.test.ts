import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { handleApiError } from './handleApiError'

function criarErroAxios(data: unknown, status = 422): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    data,
    status,
    statusText: 'Unprocessable Entity',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  })
}

describe('handleApiError', () => {
  it('extrai error.error.message do envelope de erro da API', () => {
    const erro = criarErroAxios({
      error: { code: 'VALIDATION_ERROR', message: "O campo 'email' é obrigatório." },
    })

    expect(handleApiError(erro)).toBe("O campo 'email' é obrigatório.")
  })

  it('devolve mensagem padrão quando o envelope não tem error.message', () => {
    const erro = criarErroAxios({ mensagemInesperada: 'algo' })

    expect(handleApiError(erro)).toBe('Ocorreu um erro inesperado.')
  })

  it('devolve mensagem padrão quando não é um erro do Axios', () => {
    expect(handleApiError(new Error('erro genérico'))).toBe('Ocorreu um erro inesperado.')
    expect(handleApiError('string qualquer')).toBe('Ocorreu um erro inesperado.')
    expect(handleApiError(null)).toBe('Ocorreu um erro inesperado.')
  })

  it('devolve mensagem padrão quando o erro Axios não tem response', () => {
    const erro = new AxiosError('Network Error', 'ERR_NETWORK')

    expect(handleApiError(erro)).toBe('Ocorreu um erro inesperado.')
  })
})
