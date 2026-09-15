import Keycloak from 'keycloak-js'
import { authStore } from './authStore'

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
})

let promessaInicializacao: Promise<boolean> | null = null

/**
 * Dispara o check-sso do Keycloak. Chamada uma única vez, em paralelo à
 * montagem do router (main.tsx) — nunca bloqueia a app pública.
 *
 * `keycloak.init()` REJEITA a promise quando o check-sso falha (não resolve
 * com `false`) — por isso a promise retornada aqui também rejeita nesse
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

/**
 * Consumo seguro do resultado da inicialização — nunca rejeita, mesmo que
 * `keycloak.init()` tenha rejeitado. Usado pelo guard de `/interno` e por
 * `apiInterno`, que não podem propagar uma exceção não tratada.
 */
export async function garantirAutenticacao(): Promise<boolean> {
  if (!promessaInicializacao) return false
  try {
    return await promessaInicializacao
  } catch {
    authStore.setState({ estado: 'anonimo' })
    return false
  }
}

/** Token JWT atual, em memória — nunca persistido em localStorage/sessionStorage. */
export function getToken(): string | undefined {
  return keycloak.token
}
