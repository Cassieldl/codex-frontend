export type EstadoPreenchimentoCampo = 'Obrigatorio' | 'Opcional' | 'Condicional'

/** Opção de campo canônico para o select de `CampoVersaoForm` (U4 — FK, nunca texto livre). */
export interface OpcaoCampoLayout {
  id: number
  nome: string
  caminhoXml: string
}

/** `CampoVersaoAdmin` — item de `GET /interno/versoes/{id}/campos` (I11). */
export interface CampoVersaoAdmin {
  id: number
  campoLayoutId: number
  campoLayoutNome: string
  tipo: string
  tamanho: string | null
  mascara: string | null
  dominio: string | null
  estadoPreenchimento: EstadoPreenchimentoCampo
  condicao: string | null
  exemplo: string | null
  notaPreenchimento: string | null
  destinoXml: string | null
  notaTransformacao: string | null
  ordem: number
  versaoConcorrencia: number
  etag?: string
}

/** `GET /interno/versoes/{id}/campos` (I11) — shape exato: campo `campos`, não `camposVersao`. */
export interface RespostaCamposVersao {
  campos: CampoVersaoAdmin[]
  camposLayoutAusentes: OpcaoCampoLayout[]
}

/** `CriarCampoVersaoDto` (I12). */
export interface CriarCampoVersaoDto {
  campoLayoutId: number
  tipo: string
  tamanho?: string
  mascara?: string
  dominio?: string
  estadoPreenchimento: EstadoPreenchimentoCampo
  condicao?: string
  exemplo?: string
  notaPreenchimento?: string
  destinoXml?: string
  notaTransformacao?: string
  ordem: number
}

/** `AtualizarCampoVersaoDto` (I13a): sem `campoLayoutId`, porque o vínculo com o campo canônico não muda. */
export type AtualizarCampoVersaoDto = Omit<CriarCampoVersaoDto, 'campoLayoutId'>
