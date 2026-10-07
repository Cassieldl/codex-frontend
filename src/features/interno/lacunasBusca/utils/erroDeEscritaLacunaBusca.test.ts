import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { interpretarErroDeEscritaLacunaBusca } from './erroDeEscritaLacunaBusca'

function erroDaApi(status: number, corpo: unknown): AxiosError {
  const response = {
    status,
    data: corpo,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse

  return new AxiosError('falha', 'ERR_BAD_REQUEST', response.config, null, response)
}

describe('interpretarErroDeEscritaLacunaBusca', () => {
  it.each(['CONFLITO_CONCORRENCIA', 'VALIDACAO_NEGOCIO', 'IF_MATCH_OBRIGATORIO'])(
    '%s significa linha velha: recarregar a fila',
    (code) => {
      const interpretado = interpretarErroDeEscritaLacunaBusca(
        erroDaApi(409, { error: { code, message: 'A lacuna mudou.' } }),
      )

      expect(interpretado.precisaRecarregarFila).toBe(true)
      expect(interpretado.mensagem).toBe('A lacuna mudou.')
    },
  )

  it('422 de validação não pede recarga e traz os campos culpados', () => {
    const interpretado = interpretarErroDeEscritaLacunaBusca(
      erroDaApi(422, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Um ou mais campos são inválidos.',
          details: [{ field: 'nota', message: 'A nota tem no máximo 500 caracteres.' }],
        },
      }),
    )

    expect(interpretado.precisaRecarregarFila).toBe(false)
    expect(interpretado.errosDeCampo).toEqual([
      { field: 'nota', message: 'A nota tem no máximo 500 caracteres.' },
    ])
  })

  it('erro fora do envelope (rede, proxy) cai na mensagem padrão sem pedir recarga', () => {
    const interpretado = interpretarErroDeEscritaLacunaBusca(new Error('Network Error'))

    expect(interpretado.precisaRecarregarFila).toBe(false)
    expect(interpretado.mensagem).toBe('Ocorreu um erro inesperado.')
    expect(interpretado.errosDeCampo).toEqual([])
  })
})
