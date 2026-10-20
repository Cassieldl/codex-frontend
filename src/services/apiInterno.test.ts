import { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'

const garantirAutenticacaoMock = vi.fn<() => Promise<boolean>>()
const getTokenMock = vi.fn<() => string | undefined>()
const renovarTokenMock = vi.fn<() => Promise<void>>()
const encerrarSessaoLocalMock = vi.fn()

vi.mock('../auth/keycloak', () => ({
  garantirAutenticacao: garantirAutenticacaoMock,
  getToken: getTokenMock,
  renovarTokenSeNecessario: renovarTokenMock,
  encerrarSessaoLocal: encerrarSessaoLocalMock,
}))

type ModuloApiInterno = typeof import('./apiInterno')
type ModuloSessaoExpirada = typeof import('../auth/sessaoExpirada')

let apiInterno: ModuloApiInterno['apiInterno']
let navegacaoDoNavegador: ModuloSessaoExpirada['navegacaoDoNavegador']

const URL_DA_TELA = '/interno/provedores/42?aba=avisos'
const ENTRADA_COM_DESTINO = '/interno/entrar?destino=%2Finterno%2Fprovedores%2F42%3Faba%3Davisos'

type Ocorrencia = 'renovou' | 'requisitou'

function adapterQueResponde(status: number, ocorrencias: Ocorrencia[] = []) {
  const capturas: InternalAxiosRequestConfig[] = []

  apiInterno.defaults.adapter = (config): Promise<AxiosResponse> => {
    ocorrencias.push('requisitou')
    capturas.push(config)
    const resposta: AxiosResponse = { data: {}, status, statusText: '', headers: {}, config }
    if (status >= 400) {
      return Promise.reject(new AxiosError('falha', String(status), config, null, resposta))
    }
    return Promise.resolve(resposta)
  }

  return capturas
}

let irPara: MockInstance<ModuloSessaoExpirada['navegacaoDoNavegador']['ir']>

// Cada teste é uma carga nova do documento: a trava de saída da sessão recomeça solta.
beforeEach(async () => {
  vi.resetModules()
  ;({ apiInterno } = await import('./apiInterno'))
  ;({ navegacaoDoNavegador } = await import('../auth/sessaoExpirada'))
  sessionStorage.clear()
  garantirAutenticacaoMock.mockReset().mockResolvedValue(true)
  getTokenMock.mockReset()
  renovarTokenMock.mockReset().mockResolvedValue(undefined)
  encerrarSessaoLocalMock.mockReset()
  irPara = vi.spyOn(navegacaoDoNavegador, 'ir').mockImplementation(() => {})
  window.history.pushState({}, '', URL_DA_TELA)
})

afterEach(() => {
  irPara.mockRestore()
  sessionStorage.clear()
  window.history.pushState({}, '', '/')
})

describe('apiInterno: renovação do token', () => {
  it('renova antes de cada requisição, e envia o token já renovado', async () => {
    const ocorrencias: Ocorrencia[] = []
    let tokenEmMemoria = 'token-vencido'
    getTokenMock.mockImplementation(() => tokenEmMemoria)
    renovarTokenMock.mockImplementation(() => {
      ocorrencias.push('renovou')
      tokenEmMemoria = 'token-renovado'
      return Promise.resolve()
    })
    const capturas = adapterQueResponde(200, ocorrencias)

    await apiInterno.get('/provedores')
    await apiInterno.put('/provedores/1', {}, { etag: 'W/"1"' })

    expect(ocorrencias).toEqual(['renovou', 'requisitou', 'renovou', 'requisitou'])
    expect(capturas.map((config) => config.headers.get('Authorization'))).toEqual([
      'Bearer token-renovado',
      'Bearer token-renovado',
    ])
  })

  it('sem sessão não tenta renovar: o keycloak-js lança quando não há refresh token', async () => {
    garantirAutenticacaoMock.mockResolvedValue(false)
    adapterQueResponde(200)

    await apiInterno.get('/provedores')

    expect(renovarTokenMock).not.toHaveBeenCalled()
  })

  it('renovação recusada: não envia a requisição e leva a /interno/entrar com o destino', async () => {
    renovarTokenMock.mockRejectedValue(new Error('refresh token vencido'))
    const capturas = adapterQueResponde(200)

    await expect(apiInterno.put('/avisos/7/publicacao', {})).rejects.toThrow()

    expect(capturas).toHaveLength(0)
    expect(encerrarSessaoLocalMock).toHaveBeenCalledTimes(1)
    expect(irPara).toHaveBeenCalledWith(ENTRADA_COM_DESTINO)
  })
})

describe('apiInterno: 401 da API', () => {
  it('com token enviado, encerra a sessão local e leva a /interno/entrar com o destino', async () => {
    getTokenMock.mockReturnValue('token-recusado')
    adapterQueResponde(401)

    await expect(apiInterno.get('/provedores')).rejects.toMatchObject({
      response: { status: 401 },
    })

    expect(encerrarSessaoLocalMock).toHaveBeenCalledTimes(1)
    expect(irPara).toHaveBeenCalledWith(ENTRADA_COM_DESTINO)
  })

  it('sem token enviado, não trata como sessão perdida', async () => {
    garantirAutenticacaoMock.mockResolvedValue(false)
    getTokenMock.mockReturnValue(undefined)
    adapterQueResponde(401)

    await expect(apiInterno.get('/provedores')).rejects.toBeInstanceOf(AxiosError)

    expect(encerrarSessaoLocalMock).not.toHaveBeenCalled()
    expect(irPara).not.toHaveBeenCalled()
  })

  it('403 não é sessão perdida: o usuário continua na tela', async () => {
    getTokenMock.mockReturnValue('token-valido')
    adapterQueResponde(403)

    await expect(apiInterno.delete('/provedores/1')).rejects.toBeInstanceOf(AxiosError)

    expect(encerrarSessaoLocalMock).not.toHaveBeenCalled()
    expect(irPara).not.toHaveBeenCalled()
  })
})

/** Contador gravado pelo registro do laço; o storage guarda uma entrada só. */
function retornosRegistrados(): number | undefined {
  const gravados = Object.keys(sessionStorage).map((chave) => sessionStorage.getItem(chave))
  const registro: unknown = JSON.parse(gravados[0] ?? 'null')
  if (typeof registro !== 'object' || registro === null) return undefined
  return (registro as { contador?: number }).contador
}

describe('apiInterno: uma expiração com várias requisições em voo', () => {
  it('três 401 em paralelo contam um retorno ao login e navegam uma vez', async () => {
    getTokenMock.mockReturnValue('token-recusado')
    adapterQueResponde(401)

    await Promise.allSettled([
      apiInterno.get('/provedores/42'),
      apiInterno.get('/provedores/42/versoes'),
      apiInterno.get('/layout/versoes'),
    ])

    expect(retornosRegistrados()).toBe(1)
    expect(irPara).toHaveBeenCalledTimes(1)
    expect(irPara).toHaveBeenCalledWith(ENTRADA_COM_DESTINO)
  })

  it('três renovações recusadas em paralelo contam um retorno ao login e navegam uma vez', async () => {
    renovarTokenMock.mockRejectedValue(new Error('refresh token vencido'))
    adapterQueResponde(200)

    await Promise.allSettled([
      apiInterno.get('/provedores/42'),
      apiInterno.get('/provedores/42/versoes'),
      apiInterno.get('/layout/versoes'),
    ])

    expect(retornosRegistrados()).toBe(1)
    expect(irPara).toHaveBeenCalledTimes(1)
    expect(irPara).toHaveBeenCalledWith(ENTRADA_COM_DESTINO)
  })
})
