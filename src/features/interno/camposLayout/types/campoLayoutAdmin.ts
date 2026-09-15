export type EstadoCampoLayout = 'Ativo' | 'Descontinuado'

/**
 * `CampoLayoutAdmin` — R3 (`analise-backend.md` §5.1a): vocabulário canônico,
 * **nunca** `tipo`/`tamanho`/`mascara`/`dominio`/`estadoPreenchimento`/
 * `condicao`/`exemplo`/`notaPreenchimento`/`destinoXml`/`notaTransformacao`
 * — comportamento vive em `CampoVersaoAdmin`, nunca aqui.
 */
export interface CampoLayoutAdmin {
  id: number
  nome: string
  caminhoXml: string
  significado: string
  grupo: string | null
  ordem: number
  estado: EstadoCampoLayout
  versaoLayoutDescontinuadoId: number | null
  publicado: boolean
  versaoConcorrencia: number
  etag?: string
}

/** `CriarCampoLayoutDto` (I16) — sem `publicado`. */
export interface CriarCampoLayoutDto {
  nome: string
  caminhoXml: string
  significado: string
  grupo?: string
  ordem: number
}

/**
 * `AtualizarCampoLayoutDto` (I17a) — `versaoLayoutDescontinuadoId` obrigatório
 * se `estado === 'Descontinuado'`, proibido caso contrário (§5.1b, validado
 * no schema Zod de `CampoLayoutForm`).
 */
export interface AtualizarCampoLayoutDto {
  nome: string
  significado: string
  grupo?: string
  ordem: number
  estado: EstadoCampoLayout
  versaoLayoutDescontinuadoId?: number
}
