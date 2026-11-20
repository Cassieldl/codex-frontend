import { describe, expect, it } from 'vitest'
import { artigosAdminKeys } from './artigosAdminKeys'

describe('artigosAdminKeys', () => {
  it('a chave de lista carrega os filtros - trocar de tipo é outra entrada de cache', () => {
    const conceito = artigosAdminKeys.list({ tipo: 'Conceito', pagina: 1 })
    const mudanca = artigosAdminKeys.list({ tipo: 'Mudanca', pagina: 1 })

    expect(conceito).not.toEqual(mudanca)
    expect(conceito).toEqual(['artigosAdmin', 'list', { tipo: 'Conceito', pagina: 1 }])
  })

  it('detail, existe e lists são ramos distintos sob a mesma raiz', () => {
    expect(artigosAdminKeys.detail(7)).toEqual(['artigosAdmin', 'detail', 7])
    expect(artigosAdminKeys.existe('como-funciona')).toEqual([
      'artigosAdmin',
      'existe',
      'como-funciona',
    ])
    expect(artigosAdminKeys.lists()).toEqual(['artigosAdmin', 'list'])

    // Invalidar pela raiz alcança os três ramos - é o que sustenta
    // `invalidateQueries({ queryKey: artigosAdminKeys.all })` nas mutations:
    // criar o artigo reservado muda a lista E a resposta de I36.
    for (const chave of [
      artigosAdminKeys.detail(7),
      artigosAdminKeys.existe('como-funciona'),
      artigosAdminKeys.lists(),
    ]) {
      expect(chave[0]).toBe(artigosAdminKeys.all[0])
    }
  })
})
