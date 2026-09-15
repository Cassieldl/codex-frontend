import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { keycloak } from '../../../auth/keycloak'
import { usePermissoesInterno } from './usePermissoesInterno'

beforeEach(() => {
  keycloak.tokenParsed = undefined
})

describe('usePermissoesInterno', () => {
  it('agrupa as roles do token por entidade, incluindo os quatro verbos + publicar', () => {
    keycloak.tokenParsed = {
      resource_access: {
        'codex-backend': {
          roles: [
            'provedores-buscar',
            'provedores-adicionar',
            'provedores-publicar',
            'erros-buscar',
            'erros-remover',
          ],
        },
      },
    }

    const { result } = renderHook(() => usePermissoesInterno())

    expect(result.current.provedores).toEqual({
      buscar: true,
      adicionar: true,
      atualizar: false,
      remover: false,
      publicar: true,
    })
    expect(result.current.erros).toEqual({
      buscar: true,
      adicionar: false,
      atualizar: false,
      remover: true,
      publicar: false,
    })
  })

  it('agrupa buscaInterna.buscar a partir da role indicebusca-buscar (M21)', () => {
    keycloak.tokenParsed = {
      resource_access: { 'codex-backend': { roles: ['indicebusca-buscar'] } },
    }

    const { result } = renderHook(() => usePermissoesInterno())

    expect(result.current.buscaInterna).toEqual({ buscar: true })
  })

  it('sem token (ou sem client codex-backend), todas as permissões são false', () => {
    keycloak.tokenParsed = undefined

    const { result } = renderHook(() => usePermissoesInterno())

    expect(result.current.provedores).toEqual({
      buscar: false,
      adicionar: false,
      atualizar: false,
      remover: false,
      publicar: false,
    })
    expect(result.current.buscaInterna).toEqual({ buscar: false })
  })
})

describe('usePermissoesInterno — comunicados (tela 12)', () => {
  it('agrupa as roles comunicados-* nos quatro verbos + publicar', () => {
    keycloak.tokenParsed = {
      resource_access: {
        'codex-backend': {
          roles: ['comunicados-buscar', 'comunicados-adicionar', 'comunicados-publicar'],
        },
      },
    }

    const { result } = renderHook(() => usePermissoesInterno())

    expect(result.current.comunicados).toEqual({
      buscar: true,
      adicionar: true,
      atualizar: false,
      remover: false,
      publicar: true,
    })
  })

  it('não confunde comunicados-* com as roles de outra entidade', () => {
    keycloak.tokenParsed = {
      resource_access: { 'codex-backend': { roles: ['avisos-remover', 'erros-adicionar'] } },
    }

    const { result } = renderHook(() => usePermissoesInterno())

    expect(result.current.comunicados).toEqual({
      buscar: false,
      adicionar: false,
      atualizar: false,
      remover: false,
      publicar: false,
    })
  })
})
