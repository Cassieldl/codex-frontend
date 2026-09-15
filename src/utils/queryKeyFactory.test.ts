import { describe, expect, it } from 'vitest'
import { criarFabricaDeChaves } from './queryKeyFactory'

interface ListarProvedoresParams {
  categoria?: string
  page: number
}

describe('criarFabricaDeChaves', () => {
  it('gera a chave "all" com o nome da entidade', () => {
    const chaves = criarFabricaDeChaves('provedores')

    expect(chaves.all).toEqual(['provedores'])
  })

  it('gera a chave "lists" a partir de "all"', () => {
    const chaves = criarFabricaDeChaves('provedores')

    expect(chaves.lists()).toEqual(['provedores', 'list'])
  })

  it('gera a chave "list" incluindo os parâmetros de filtro/paginação', () => {
    const chaves = criarFabricaDeChaves<ListarProvedoresParams>('provedores')
    const params: ListarProvedoresParams = { categoria: 'Nacional', page: 2 }

    expect(chaves.list(params)).toEqual(['provedores', 'list', params])
  })

  it('duas entidades diferentes nunca colidem na raiz da chave', () => {
    const provedores = criarFabricaDeChaves('provedores')
    const erros = criarFabricaDeChaves('erros')

    expect(provedores.all).not.toEqual(erros.all)
  })

  it('permite estender com chaves específicas da entidade (ex.: detail)', () => {
    const base = criarFabricaDeChaves<{ page: number }>('provedores')
    const provedoresKeys = {
      ...base,
      detail: (slug: string) => [...base.all, 'detail', slug] as const,
    }

    expect(provedoresKeys.detail('migrate-ltda')).toEqual(['provedores', 'detail', 'migrate-ltda'])
  })
})
