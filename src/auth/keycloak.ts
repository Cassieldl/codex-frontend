import Keycloak from 'keycloak-js'
import { authStore } from './authStore'

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
})

/**
 * Idioma da tela de login, que é hospedada pelo Keycloak (D1/M18) e não por
 * nós. Sem isto ela abre no idioma padrão do realm - em inglês, no meio de um
 * portal inteiramente em português, logo na porta da área interna.
 *
 * O realm também declara `pt-BR` como padrão; pedir aqui mantém a garantia do
 * lado do produto, que é quem sabe em que idioma ele fala.
 */
export const IDIOMA_LOGIN = 'pt-BR'

let promessaInicializacao: Promise<boolean> | null = null

/**
 * Dispara o check-sso do Keycloak. Chamada uma única vez, em paralelo à
 * montagem do router (main.tsx) - nunca bloqueia a app pública.
 *
 * `keycloak.init()` REJEITA a promise quando o check-sso falha (não resolve
 * com `false`) - por isso a promise retornada aqui também rejeita nesse
 * caso. Quem chama (main.tsx) é responsável por `.catch()`; `garantirAutenticacao`
 * é a forma segura de consumir o resultado sem propagar a rejeição.
 */
export function iniciarAutenticacao(): Promise<boolean> {
  promessaInicializacao = keycloak.init({
    onLoad: 'check-sso',
    silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    pkceMethod: 'S256',
  })

  return promessaInicializacao.then((autenticado) => {
    authStore.setState({ estado: autenticado ? 'autenticado' : 'anonimo' })
    return autenticado
  })
}

/** Resultado do check-sso: `indisponivel` quando o Keycloak nem respondeu. */
export type EstadoDaSessao = 'autenticado' | 'anonimo' | 'indisponivel'

/** Renova o token quando falta menos que isto para ele vencer. */
const VALIDADE_MINIMA_DO_TOKEN_EM_SEGUNDOS = 30

let sessaoEncerrada = false

/**
 * Consumo seguro do resultado da inicialização: nunca rejeita, mesmo que
 * `keycloak.init()` tenha rejeitado. Distingue o anônimo do Keycloak fora do ar,
 * que o guard de `/interno` mostra numa tela própria em vez de mandar ao login.
 */
export async function verificarSessao(): Promise<EstadoDaSessao> {
  if (!promessaInicializacao || sessaoEncerrada) return 'anonimo'
  try {
    return (await promessaInicializacao) ? 'autenticado' : 'anonimo'
  } catch {
    authStore.setState({ estado: 'anonimo' })
    return 'indisponivel'
  }
}

/** Atalho booleano de `verificarSessao`, usado por `apiInterno`. */
export async function garantirAutenticacao(): Promise<boolean> {
  return (await verificarSessao()) === 'autenticado'
}

/** O keycloak-js não renova sozinho: sem isto o token vence e a API passa a responder 401. */
export async function renovarTokenSeNecessario(): Promise<void> {
  await keycloak.updateToken(VALIDADE_MINIMA_DO_TOKEN_EM_SEGUNDOS)
}

/** Descarta os tokens em memória; a sessão SSO no Keycloak não é tocada. */
export function encerrarSessaoLocal(): void {
  sessaoEncerrada = true
  keycloak.clearToken()
  authStore.setState({ estado: 'anonimo' })
}

/** Token JWT atual, em memória. Nunca persistido em localStorage/sessionStorage. */
export function getToken(): string | undefined {
  return keycloak.token
}
