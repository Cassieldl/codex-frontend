import { describe, expect, it } from 'vitest'
import type { ResultadoItem } from '../../../busca/types/resultadoBusca'
import { caminhoDoItemBuscaInterna, resolverLinkParaCopiar } from './resolverLinkParaCopiar'

const URL_BASE = 'https://codex.migrate.info'

function criarItem(sobrescritas: Partial<ResultadoItem> = {}): ResultadoItem {
  return {
    tipo: 'erro',
    rotulo: 'Erro',
    chave: 'e0117-ipm',
    titulo: 'RPS inválido',
    url: '/erros/e0117-ipm',
    provedorNome: null,
    versaoRotulo: null,
    versoes: null,
    descricaoCasamento: '',
    publicado: true,
    meta: null,
    pontuacao: 1,
    trechos: [],
    ...sobrescritas,
  }
}

describe('resolverLinkParaCopiar — PQ-09', () => {
  it('item publicado copia a URL pública marcada com a origem do atendimento', () => {
    expect(resolverLinkParaCopiar(criarItem(), URL_BASE)).toBe(
      `${URL_BASE}/erros/e0117-ipm?origem=atendimento`,
    )
  })

  it('item em rascunho copia o link INTERNO de edição, nunca a URL pública', () => {
    const rascunho = criarItem({ tipo: 'artigo', url: '/artigos/migrar', publicado: false })

    const link = resolverLinkParaCopiar(rascunho, URL_BASE)

    // O bug corrigido: a URL pública de um rascunho devolve 404/410 para quem
    // recebe o link no chamado.
    expect(link).not.toContain('/artigos/migrar')
    expect(link).toBe(`${URL_BASE}/interno/artigos?origem=atendimento`)
  })

  it('rascunho de tipo sem rota de edição não copia nada — o chamador explica o motivo', () => {
    const aviso = criarItem({ tipo: 'aviso', url: '/provedores/x', publicado: false })

    expect(resolverLinkParaCopiar(aviso, URL_BASE)).toBeNull()
    expect(caminhoDoItemBuscaInterna(aviso)).toBeNull()
  })

  it('url malformada de item publicado não vira link copiável (BAIXO-04)', () => {
    // "@evil.com" concatenado com a origem resolve para o host evil.com.
    expect(resolverLinkParaCopiar(criarItem({ url: '@evil.com' }), URL_BASE)).toBeNull()
    expect(resolverLinkParaCopiar(criarItem({ url: '//evil.com' }), URL_BASE)).toBeNull()
    expect(
      resolverLinkParaCopiar(criarItem({ url: `/${String.fromCharCode(9)}/evil.com` }), URL_BASE),
    ).toBeNull()
  })

  it('cada tipo com rota de edição leva ao seu próprio destino', () => {
    const destinos = ['erro', 'campoLayout', 'provedor'].map((tipo) =>
      resolverLinkParaCopiar(criarItem({ tipo, publicado: false }), URL_BASE),
    )

    expect(destinos).toEqual([
      `${URL_BASE}/interno/erros?origem=atendimento`,
      `${URL_BASE}/interno/campos-layout?origem=atendimento`,
      `${URL_BASE}/interno/provedores?origem=atendimento`,
    ])
  })
})
