import { beforeEach, describe, expect, it, vi } from 'vitest'

const initMock = vi.fn()

vi.mock('keycloak-js', () => ({
  default: vi.fn().mockImplementation(function KeycloakMock() {
    return {
      init: initMock,
      token: undefined,
    }
  }),
}))

const { authStore } = await import('./authStore')
const { garantirAutenticacao, iniciarAutenticacao } = await import('./keycloak')

beforeEach(() => {
  initMock.mockReset()
  authStore.setState({ estado: 'carregando' })
})

describe('iniciarAutenticacao', () => {
  it('resolve true e marca o authStore como autenticado quando o mock resolve autenticado', async () => {
    initMock.mockResolvedValueOnce(true)

    await expect(iniciarAutenticacao()).resolves.toBe(true)
    expect(authStore.getState()).toEqual({ estado: 'autenticado' })
  })

  it('resolve false e marca o authStore como anônimo quando o mock resolve não autenticado', async () => {
    initMock.mockResolvedValueOnce(false)

    await expect(iniciarAutenticacao()).resolves.toBe(false)
    expect(authStore.getState()).toEqual({ estado: 'anonimo' })
  })

  it('propaga a rejeição quando keycloak.init() rejeita (check-sso falhou)', async () => {
    initMock.mockRejectedValueOnce(new Error('check-sso falhou'))

    await expect(iniciarAutenticacao()).rejects.toThrow('check-sso falhou')
  })
})

describe('garantirAutenticacao', () => {
  it('devolve false sem inicialização prévia', async () => {
    await expect(garantirAutenticacao()).resolves.toBe(false)
  })

  it('não rejeita mesmo quando keycloak.init() rejeita, e marca anônimo', async () => {
    initMock.mockRejectedValueOnce(new Error('check-sso falhou'))

    // Simula main.tsx: dispara e trata a rejeição por fora, sem esperar aqui.
    iniciarAutenticacao().catch(() => {
      authStore.setState({ estado: 'anonimo' })
    })

    await expect(garantirAutenticacao()).resolves.toBe(false)
    expect(authStore.getState()).toEqual({ estado: 'anonimo' })
  })

  it('devolve o mesmo resultado de iniciarAutenticacao quando o check-sso é bem-sucedido', async () => {
    initMock.mockResolvedValueOnce(true)

    await iniciarAutenticacao()

    await expect(garantirAutenticacao()).resolves.toBe(true)
  })
})
