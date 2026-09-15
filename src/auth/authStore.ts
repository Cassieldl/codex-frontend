import { useSyncExternalStore } from 'react'

export type EstadoAutenticacao = 'carregando' | 'autenticado' | 'anonimo'

export interface AuthState {
  estado: EstadoAutenticacao
}

type Ouvinte = (state: AuthState) => void

/**
 * Store minimalista de autenticação, fora do React. Não usa Keycloak/rede
 * diretamente — apenas guarda o estado atual e notifica assinantes quando
 * `auth/keycloak.ts` (via `iniciarAutenticacao`/`garantirAutenticacao`)
 * atualiza o resultado do check-sso.
 */
function criarAuthStore(estadoInicial: AuthState) {
  let state = estadoInicial
  const ouvintes = new Set<Ouvinte>()

  return {
    getState(): AuthState {
      return state
    },
    setState(parcial: Partial<AuthState>): void {
      state = { ...state, ...parcial }
      ouvintes.forEach((ouvinte) => ouvinte(state))
    },
    subscribe(ouvinte: Ouvinte): () => void {
      ouvintes.add(ouvinte)
      return () => {
        ouvintes.delete(ouvinte)
      }
    },
  }
}

export const authStore = criarAuthStore({ estado: 'carregando' })

/** Hook de leitura do estado de autenticação — só para UX (esconder/mostrar elementos). */
export function useAuthState(): AuthState {
  return useSyncExternalStore(authStore.subscribe, authStore.getState, authStore.getState)
}
