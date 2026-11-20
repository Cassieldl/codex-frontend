import { describe, expect, it } from 'vitest'
import { artigosKeys } from '../../artigos/hooks/artigosKeys'
import { provedoresKeys } from '../../provedores/hooks/provedoresKeys'
import { homeKeys } from './homeKeys'

describe('homeKeys', () => {
  it('é uma chave única para o agregador inteiro - sem parâmetro nenhum', () => {
    expect(homeKeys.all).toEqual(['home'])
  })

  it('não colide com o cache das features que a Home exibe', () => {
    // A Home mostra provedores e artigos, mas não os busca pelos endpoints
    // deles: se a chave colidisse, invalidar a listagem de provedores
    // derrubaria (ou pior, reaproveitaria) o agregado da Home.
    expect(homeKeys.all).not.toEqual(provedoresKeys.all)
    expect(homeKeys.all).not.toEqual(artigosKeys.all)
  })
})
