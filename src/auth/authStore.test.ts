import { describe, expect, it, vi } from 'vitest'
import { authStore } from './authStore'

describe('authStore', () => {
  it('muda de estado ao chamar setState', () => {
    authStore.setState({ estado: 'anonimo' })
    expect(authStore.getState()).toEqual({ estado: 'anonimo' })

    authStore.setState({ estado: 'autenticado' })
    expect(authStore.getState()).toEqual({ estado: 'autenticado' })
  })

  it('notifica assinantes quando o estado muda', () => {
    const ouvinte = vi.fn()
    const cancelarInscricao = authStore.subscribe(ouvinte)

    authStore.setState({ estado: 'autenticado' })

    expect(ouvinte).toHaveBeenCalledWith({ estado: 'autenticado' })

    cancelarInscricao()
  })

  it('para de notificar depois de cancelar a inscrição', () => {
    const ouvinte = vi.fn()
    const cancelarInscricao = authStore.subscribe(ouvinte)
    cancelarInscricao()

    authStore.setState({ estado: 'anonimo' })

    expect(ouvinte).not.toHaveBeenCalled()
  })

  it('notifica múltiplos assinantes de forma independente', () => {
    const ouvinteA = vi.fn()
    const ouvinteB = vi.fn()
    const cancelarA = authStore.subscribe(ouvinteA)
    const cancelarB = authStore.subscribe(ouvinteB)

    authStore.setState({ estado: 'autenticado' })

    expect(ouvinteA).toHaveBeenCalledTimes(1)
    expect(ouvinteB).toHaveBeenCalledTimes(1)

    cancelarA()
    cancelarB()
  })
})
