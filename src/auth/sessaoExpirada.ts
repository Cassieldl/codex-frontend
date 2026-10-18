import { encerrarSessaoLocal } from './keycloak'
import { registrarRetornoAoLogin } from './lacoDeRetornoAoLogin'

/** Navegação de documento inteiro, isolada para o teste poder observá-la (o jsdom não navega). */
export const navegacaoDoNavegador = {
  ir(url: string): void {
    window.location.assign(url)
  },
  recarregar(): void {
    window.location.reload()
  },
}

export function caminhoDeEntrada(destino: string): string {
  return `/interno/entrar?${new URLSearchParams({ destino }).toString()}`
}

function destinoAtual(): string {
  const { pathname, search, hash } = window.location
  return `${pathname}${search}${hash}`
}

// Uma expiração derruba juntas todas as requisições em voo: só a primeira conta e navega.
// A navegação de documento inteiro carrega o módulo de novo e solta a trava.
let saidaIniciadaNestaCarga = false

/**
 * Sessão que não renova mais (refresh token vencido ou recusado) não tem conserto na tela atual.
 * A navegação é de documento inteiro de propósito: o keycloak-js só inicializa uma vez por carga.
 */
export function encerrarSessaoEIrParaEntrada(): void {
  if (saidaIniciadaNestaCarga) return
  saidaIniciadaNestaCarga = true

  encerrarSessaoLocal()
  registrarRetornoAoLogin()
  navegacaoDoNavegador.ir(caminhoDeEntrada(destinoAtual()))
}
