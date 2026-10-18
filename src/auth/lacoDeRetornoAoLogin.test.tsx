import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { AxiosResponse } from 'axios'
import type { KeycloakLoginOptions, KeycloakLogoutOptions } from 'keycloak-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loginMock = vi.fn<(opcoes?: KeycloakLoginOptions) => Promise<void>>()
const logoutMock = vi.fn<(opcoes?: KeycloakLogoutOptions) => Promise<void>>()

vi.mock('./keycloak', () => ({
  keycloak: { login: loginMock, logout: logoutMock },
  IDIOMA_LOGIN: 'pt-BR',
  garantirAutenticacao: () => Promise.resolve(true),
  verificarSessao: () => Promise.resolve('autenticado'),
  renovarTokenSeNecessario: () => Promise.resolve(),
  getToken: () => 'token-que-a-api-recusa',
  encerrarSessaoLocal: () => {},
}))

const { Route: rotaEntrar } = await import('../routes/interno/entrar')
const {
  JANELA_DO_LACO_MS,
  RETORNOS_QUE_CARACTERIZAM_LACO,
  estaEmLacoDeRetorno,
  registrarRetornoAoLogin,
} = await import('./lacoDeRetornoAoLogin')

type VinculoDeRotaDeArquivo = Parameters<typeof rotaEntrar.update>[0]
type ClienteInterno = (typeof import('../services/apiInterno'))['apiInterno']

/** A API recusa com 401 toda requisição que leva token, como um backend que não aceita o client. */
function apiQueRecusaTodoToken(apiInterno: ClienteInterno) {
  apiInterno.defaults.adapter = async (config): Promise<AxiosResponse> => {
    const resposta: AxiosResponse = { data: {}, status: 401, statusText: '', headers: {}, config }
    throw new AxiosError('recusado', '401', config, null, resposta)
  }
}

/** Monta a rota real de `/interno/entrar`, como a carga de documento que a navegação faz. */
function abrirEntrada() {
  const rotaRaiz = createRootRoute({ component: Outlet })
  const rotaDoPortal = createRoute({
    getParentRoute: () => rotaRaiz,
    path: '/',
    component: () => <p>Portal</p>,
  })
  const entrada = rotaEntrar.update({
    id: '/interno/entrar',
    path: '/interno/entrar',
    getParentRoute: () => rotaRaiz,
  } as unknown as VinculoDeRotaDeArquivo)
  const router = createRouter({
    routeTree: rotaRaiz.addChildren([rotaDoPortal, entrada]),
    history: createMemoryHistory({ initialEntries: ['/interno/entrar?destino=%2Finterno'] }),
  })
  return render(<RouterProvider router={router} />)
}

let navegacoes: string[] = []
let espioesDaNavegacao: { mockRestore: () => void }[] = []

/**
 * Uma volta do ciclo: a tela pede dados, a API recusa e a sessão vai para a entrada. Cada volta é
 * uma carga nova do documento, então os módulos da sessão e do cliente recomeçam do zero.
 */
async function requisicaoRecusada() {
  vi.resetModules()
  const { navegacaoDoNavegador } = await import('./sessaoExpirada')
  espioesDaNavegacao.push(
    vi.spyOn(navegacaoDoNavegador, 'ir').mockImplementation((url) => {
      navegacoes.push(url)
    }),
  )
  const { apiInterno } = await import('../services/apiInterno')
  apiQueRecusaTodoToken(apiInterno)

  await expect(apiInterno.get('/provedores')).rejects.toBeInstanceOf(AxiosError)
}

beforeEach(() => {
  sessionStorage.clear()
  navegacoes = []
  espioesDaNavegacao = []
  loginMock.mockReset().mockResolvedValue(undefined)
  logoutMock.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  espioesDaNavegacao.forEach((espiao) => espiao.mockRestore())
  sessionStorage.clear()
})

describe('laço de volta ao login', () => {
  it('com a API recusando todo token, para de mandar ao login e explica o acesso recusado', async () => {
    for (let volta = 1; volta < RETORNOS_QUE_CARACTERIZAM_LACO; volta++) {
      await requisicaoRecusada()
      abrirEntrada()
      expect(await screen.findByText('Redirecionando para o login da Migrate…')).toBeVisible()
      expect(loginMock).toHaveBeenCalledTimes(volta)
      cleanup()
    }

    await requisicaoRecusada()
    abrirEntrada()

    expect(
      await screen.findByRole('heading', { name: 'O acesso à área interna foi recusado' }),
    ).toBeInTheDocument()
    expect(loginMock).toHaveBeenCalledTimes(RETORNOS_QUE_CARACTERIZAM_LACO - 1)
    expect(navegacoes).toHaveLength(RETORNOS_QUE_CARACTERIZAM_LACO)
  })

  it('o registro guarda só contador e horário, nunca o token', async () => {
    await requisicaoRecusada()

    const gravado = Object.keys(sessionStorage).map((chave) => sessionStorage.getItem(chave))
    expect(gravado.join('')).not.toContain('token-que-a-api-recusa')
    expect(JSON.parse(gravado[0] ?? '{}')).toEqual({ contador: 1, desde: expect.any(Number) })
  })

  it('tentar de novo recomeça a contagem e vai ao login', async () => {
    const usuario = userEvent.setup()
    for (let volta = 0; volta < RETORNOS_QUE_CARACTERIZAM_LACO; volta++) await requisicaoRecusada()
    abrirEntrada()

    await usuario.click(await screen.findByRole('button', { name: 'Tentar de novo' }))

    expect(loginMock).toHaveBeenCalledTimes(1)
    expect(estaEmLacoDeRetorno()).toBe(false)
  })

  it('sair encerra a sessão SSO e volta ao portal', async () => {
    const usuario = userEvent.setup()
    for (let volta = 0; volta < RETORNOS_QUE_CARACTERIZAM_LACO; volta++) await requisicaoRecusada()
    abrirEntrada()

    await usuario.click(await screen.findByRole('button', { name: 'Sair da conta Migrate' }))

    expect(logoutMock).toHaveBeenCalledWith({ redirectUri: window.location.origin })
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('voltas espaçadas além da janela são expirações comuns, não laço', () => {
    const inicio = 1_000_000
    for (let volta = 0; volta < RETORNOS_QUE_CARACTERIZAM_LACO; volta++) {
      registrarRetornoAoLogin(inicio + volta * (JANELA_DO_LACO_MS + 1))
    }

    expect(estaEmLacoDeRetorno(inicio + 2 * (JANELA_DO_LACO_MS + 1))).toBe(false)
  })

  it('o laço expira com a janela: depois dela, a entrada volta a mandar ao login', () => {
    const inicio = 1_000_000
    for (let volta = 0; volta < RETORNOS_QUE_CARACTERIZAM_LACO; volta++) {
      registrarRetornoAoLogin(inicio + volta)
    }

    expect(estaEmLacoDeRetorno(inicio + 10)).toBe(true)
    expect(estaEmLacoDeRetorno(inicio + JANELA_DO_LACO_MS + 1)).toBe(false)
  })
})

// Números escritos por extenso de propósito: a regra é "3 retornos em 2 minutos", e um teste que
// lesse as constantes do módulo continuaria verde se alguém as trocasse.
describe('laço de volta ao login: a regra em números', () => {
  const inicio = 1_000_000

  it('3 retornos com o último 119999 ms depois do primeiro caracterizam laço', () => {
    registrarRetornoAoLogin(inicio)
    registrarRetornoAoLogin(inicio + 60_000)
    registrarRetornoAoLogin(inicio + 119_999)

    expect(estaEmLacoDeRetorno(inicio + 119_999)).toBe(true)
  })

  it('2 retornos seguidos não caracterizam laço', () => {
    registrarRetornoAoLogin(inicio)
    registrarRetornoAoLogin(inicio + 1)

    expect(estaEmLacoDeRetorno(inicio + 1)).toBe(false)
  })

  it('3 retornos com o último 120001 ms depois do primeiro não caracterizam laço', () => {
    registrarRetornoAoLogin(inicio)
    registrarRetornoAoLogin(inicio + 60_000)
    registrarRetornoAoLogin(inicio + 120_001)

    expect(estaEmLacoDeRetorno(inicio + 120_001)).toBe(false)
  })
})
