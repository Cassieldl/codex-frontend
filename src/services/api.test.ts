import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const garantirAutenticacaoMock = vi.fn().mockResolvedValue(true)
const getTokenMock = vi.fn<() => string | undefined>()

vi.mock('../auth/keycloak', () => ({
  garantirAutenticacao: garantirAutenticacaoMock,
  getToken: getTokenMock,
}))

const { apiPublico } = await import('./api')
const { apiInterno } = await import('./apiInterno')

function criarAdapterEspiao(capturas: InternalAxiosRequestConfig[]) {
  return async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    capturas.push(config)
    return {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
}

beforeEach(() => {
  getTokenMock.mockReset()
  garantirAutenticacaoMock.mockClear()
})

describe('apiPublico', () => {
  it('nunca injeta Authorization, mesmo havendo token disponível no Keycloak', async () => {
    getTokenMock.mockReturnValue('token-fake')
    const capturas: InternalAxiosRequestConfig[] = []
    apiPublico.defaults.adapter = criarAdapterEspiao(capturas)

    await apiPublico.get('/provedores')

    expect(capturas[0]?.headers?.get?.('Authorization')).toBeFalsy()
    expect(garantirAutenticacaoMock).not.toHaveBeenCalled()
  })
})

describe('apiInterno', () => {
  it('injeta Authorization quando há token', async () => {
    getTokenMock.mockReturnValue('token-fake')
    const capturas: InternalAxiosRequestConfig[] = []
    apiInterno.defaults.adapter = criarAdapterEspiao(capturas)

    await apiInterno.get('/provedores')

    expect(garantirAutenticacaoMock).toHaveBeenCalledTimes(1)
    expect(capturas[0]?.headers?.get?.('Authorization')).toBe('Bearer token-fake')
  })

  it('não injeta Authorization quando não há token (sessão anônima)', async () => {
    getTokenMock.mockReturnValue(undefined)
    const capturas: InternalAxiosRequestConfig[] = []
    apiInterno.defaults.adapter = criarAdapterEspiao(capturas)

    await apiInterno.get('/provedores')

    expect(capturas[0]?.headers?.get?.('Authorization')).toBeFalsy()
  })

  it('anexa If-Match a partir do etag em mutações (PUT)', async () => {
    getTokenMock.mockReturnValue('token-fake')
    const capturas: InternalAxiosRequestConfig[] = []
    apiInterno.defaults.adapter = criarAdapterEspiao(capturas)

    await apiInterno.put('/provedores/1', { nome: 'Novo nome' }, { etag: 'W/"42"' })

    expect(capturas[0]?.headers?.get?.('If-Match')).toBe('W/"42"')
  })

  it('não anexa If-Match em GET, mesmo se etag fosse passado', async () => {
    getTokenMock.mockReturnValue('token-fake')
    const capturas: InternalAxiosRequestConfig[] = []
    apiInterno.defaults.adapter = criarAdapterEspiao(capturas)

    await apiInterno.get('/provedores/1', { etag: 'W/"42"' })

    expect(capturas[0]?.headers?.get?.('If-Match')).toBeFalsy()
  })

  it('não anexa If-Match quando a mutação não informa etag', async () => {
    getTokenMock.mockReturnValue('token-fake')
    const capturas: InternalAxiosRequestConfig[] = []
    apiInterno.defaults.adapter = criarAdapterEspiao(capturas)

    await apiInterno.delete('/provedores/1')

    expect(capturas[0]?.headers?.get?.('If-Match')).toBeFalsy()
  })
})
