import { describe, expect, it } from 'vitest'
import { filtrarProvedoresPorNome } from './filtrarProvedoresPorNome'

const provedores = [{ nome: 'João Pessoa' }, { nome: 'ISS.NET' }, { nome: 'Betha' }]

describe('filtrarProvedoresPorNome', () => {
  it('ignora acento e caixa', () => {
    expect(filtrarProvedoresPorNome(provedores, 'JOAO')).toEqual([{ nome: 'João Pessoa' }])
    expect(filtrarProvedoresPorNome(provedores, 'iss')).toEqual([{ nome: 'ISS.NET' }])
  })

  it('filtro vazio ou só espaço devolve todos', () => {
    expect(filtrarProvedoresPorNome(provedores, '   ')).toHaveLength(3)
  })

  it('sem casamento devolve lista vazia', () => {
    expect(filtrarProvedoresPorNome(provedores, 'xyz')).toEqual([])
  })
})
