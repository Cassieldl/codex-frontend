// Espelha o contrato de `GET /layout/versoes/{versaoSlug}/estrutura`.

import type { LayoutVersaoResumo } from './layoutPublico'

/** Em quais envios a tag existe: SOAP (XML), REST (JSON) ou os dois. */
export type PresencaDoNo = 'ambos' | 'soXml' | 'soJson'

export interface NoEstrutura {
  nome: string
  caminho: string
  ehGrupo: boolean
  repete: boolean
  /** Alternativa de um xs:choice: o parceiro informa uma só entre os irmãos com `escolha`. */
  escolha: boolean
  /** Só em folhas: "texto(30)", "0.00", "AAAA-MM-DD". */
  valorModelo: string | null
  campoSlug: string | null
  formato: PresencaDoNo
  filhos: NoEstrutura[]
}

export interface EstruturaLayout {
  versao: LayoutVersaoResumo
  /** Raiz `Envio`. */
  xml: NoEstrutura
  /** Raiz `Documento`, na convenção REST do InvoiCy. */
  json: NoEstrutura
}

export const FORMATOS_DA_ESTRUTURA = ['xml', 'json'] as const

export type FormatoDaEstrutura = (typeof FORMATOS_DA_ESTRUTURA)[number]

export const VISOES_DO_LAYOUT = ['dicionario', 'xml', 'json'] as const

export type VisaoDoLayout = (typeof VISOES_DO_LAYOUT)[number]

export const ROTULO_DO_FORMATO: Record<FormatoDaEstrutura, string> = {
  xml: 'XML (SOAP)',
  json: 'JSON (REST)',
}
