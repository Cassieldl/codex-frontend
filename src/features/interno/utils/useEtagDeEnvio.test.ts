import { act, renderHook } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { useEtagDeEnvio } from './useEtagDeEnvio'

function erroDaApi(status: number, code: string) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('falha', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: { error: { code, message: 'Mensagem do backend.' } },
  })
}

interface Props {
  abertura: number | null
  etagAtual: string | undefined
}

function renderizar(inicial: Props) {
  return renderHook(({ abertura, etagAtual }: Props) => useEtagDeEnvio(abertura, etagAtual), {
    initialProps: inicial,
  })
}

describe('useEtagDeEnvio', () => {
  it('refetch sem 409 não troca o etag: vale o da leitura em que o registro abriu', () => {
    const { result, rerender } = renderizar({ abertura: 7, etagAtual: 'W/"10"' })

    rerender({ abertura: 7, etagAtual: 'W/"11"' })
    act(() => result.current.registrarErro(erroDaApi(422, 'VALIDACAO_NEGOCIO')))

    expect(result.current.etag).toBe('W/"10"')
  })

  it('depois de um 409 de concorrência passa a valer o etag relido', () => {
    const { result, rerender } = renderizar({ abertura: 7, etagAtual: 'W/"10"' })

    act(() => result.current.registrarErro(erroDaApi(409, 'CONFLITO_CONCORRENCIA')))
    rerender({ abertura: 7, etagAtual: 'W/"11"' })

    expect(result.current.etag).toBe('W/"11"')
  })

  it('fechar e reabrir recomeça da leitura atual, sem herdar o conflito anterior', () => {
    const { result, rerender } = renderizar({ abertura: 7, etagAtual: 'W/"10"' })
    act(() => result.current.registrarErro(erroDaApi(409, 'CONFLITO_CONCORRENCIA')))

    rerender({ abertura: null, etagAtual: undefined })
    rerender({ abertura: 7, etagAtual: 'W/"11"' })
    rerender({ abertura: 7, etagAtual: 'W/"12"' })

    expect(result.current.etag).toBe('W/"11"')
  })

  it('detalhe que chega depois da abertura fixa o etag dele', () => {
    const { result, rerender } = renderizar({ abertura: 7, etagAtual: undefined })

    rerender({ abertura: 7, etagAtual: 'W/"10"' })
    rerender({ abertura: 7, etagAtual: 'W/"11"' })

    expect(result.current.etag).toBe('W/"10"')
  })
})
