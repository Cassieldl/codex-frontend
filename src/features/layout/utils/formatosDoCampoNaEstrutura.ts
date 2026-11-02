import type { EstruturaLayout, FormatoDaEstrutura, NoEstrutura } from '../types/estruturaLayout'

// Arrays constantes: a linha do dicionário é `memo`, e um array novo por render anularia isso.
const AMBOS: readonly FormatoDaEstrutura[] = ['xml', 'json']
const SO_XML: readonly FormatoDaEstrutura[] = ['xml']
const SO_JSON: readonly FormatoDaEstrutura[] = ['json']
const NENHUM: readonly FormatoDaEstrutura[] = []

export type FormatosDoCampo = (campoSlug: string) => readonly FormatoDaEstrutura[]

function coletarSlugs(no: NoEstrutura, destino: Set<string>) {
  if (no.campoSlug !== null) destino.add(no.campoSlug)
  no.filhos.forEach((filho) => coletarSlugs(filho, destino))
}

/**
 * Em quais formatos cada campo aparece. Sem estrutura carregada a resposta é "os dois": a página
 * da estrutura resolve o caso em que a tag não existe naquele formato. Com a estrutura sabidamente
 * indisponível (404), nenhum: o atalho só levaria ao aviso.
 */
export function criarFormatosDoCampo(
  estrutura: EstruturaLayout | undefined,
  estruturaIndisponivel = false,
): FormatosDoCampo {
  if (estruturaIndisponivel) return () => NENHUM
  if (!estrutura) return () => AMBOS

  const noXml = new Set<string>()
  const noJson = new Set<string>()
  coletarSlugs(estrutura.xml, noXml)
  coletarSlugs(estrutura.json, noJson)

  return (campoSlug) => {
    const xml = noXml.has(campoSlug)
    const json = noJson.has(campoSlug)
    if (xml && json) return AMBOS
    if (xml) return SO_XML
    if (json) return SO_JSON
    return NENHUM
  }
}
