import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const garantirAutenticacaoMock = vi.fn()

vi.mock('../../auth/keycloak', () => ({
  garantirAutenticacao: garantirAutenticacaoMock,
}))

const { Route, useNoIndex } = await import('./_autenticado')

type ContextoBeforeLoad = Parameters<NonNullable<typeof Route.options.beforeLoad>>[0]

function criarContexto(href: string): ContextoBeforeLoad {
  return { location: { href } } as unknown as ContextoBeforeLoad
}

function chamarBeforeLoad(href: string) {
  const beforeLoad = Route.options.beforeLoad
  if (!beforeLoad) throw new Error('beforeLoad não definido na rota _autenticado')
  return beforeLoad(criarContexto(href))
}

beforeEach(() => {
  garantirAutenticacaoMock.mockReset()
})

describe('guard /interno/_autenticado', () => {
  it('sem sessão, redireciona para /interno/entrar preservando ?destino=', async () => {
    garantirAutenticacaoMock.mockResolvedValue(false)

    let capturado: unknown
    try {
      await chamarBeforeLoad('/interno/provedores/42')
    } catch (erro) {
      capturado = erro
    }

    expect(capturado).toBeInstanceOf(Response)
    const redirecionamento = capturado as Response & {
      options: { to: string; search: { destino: string } }
    }
    expect(redirecionamento.options.to).toBe('/interno/entrar')
    expect(redirecionamento.options.search).toEqual({ destino: '/interno/provedores/42' })
  })

  it('com sessão, deixa passar (não lança redirect)', async () => {
    garantirAutenticacaoMock.mockResolvedValue(true)

    await expect(chamarBeforeLoad('/interno')).resolves.toBeUndefined()
  })
})

describe('useNoIndex — Achado #4 (noindex em /interno/**)', () => {
  it('adiciona <meta name="robots" content="noindex, nofollow"> ao montar e remove ao desmontar', () => {
    expect(document.querySelector('meta[name="robots"]')).toBeNull()

    const { unmount } = renderHook(() => useNoIndex())

    const meta = document.querySelector('meta[name="robots"]')
    expect(meta).not.toBeNull()
    expect(meta).toHaveAttribute('content', 'noindex, nofollow')

    unmount()

    expect(document.querySelector('meta[name="robots"]')).toBeNull()
  })
})
