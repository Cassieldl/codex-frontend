import { describe, expect, it } from 'vitest'
import { comunicadosAdminKeys } from './comunicadosAdminKeys'

describe('comunicadosAdminKeys', () => {
  it('a chave de lista carrega os filtros que mudam a resposta', () => {
    const chave = comunicadosAdminKeys.list({
      severidade: 'Critico',
      incluirEncerrados: true,
      pagina: 2,
    })

    expect(chave).toEqual([
      'comunicadosAdmin',
      'list',
      { severidade: 'Critico', incluirEncerrados: true, pagina: 2 },
    ])
  })

  it('duas visões que diferem só por incluirEncerrados nao compartilham cache', () => {
    const padrao = comunicadosAdminKeys.list({ incluirEncerrados: false, pagina: 1 })
    const comEncerrados = comunicadosAdminKeys.list({ incluirEncerrados: true, pagina: 1 })

    expect(padrao).not.toEqual(comEncerrados)
  })

  it('detail é prefixado por all — invalidar a raiz alcança lista e detalhe', () => {
    expect(comunicadosAdminKeys.detail(7)).toEqual(['comunicadosAdmin', 'detail', 7])
    expect(comunicadosAdminKeys.detail(7).slice(0, 1)).toEqual([...comunicadosAdminKeys.all])
    expect(comunicadosAdminKeys.lists().slice(0, 1)).toEqual([...comunicadosAdminKeys.all])
  })
})
