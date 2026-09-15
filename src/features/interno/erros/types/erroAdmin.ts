export type OrigemErro = 'Prefeitura' | 'InvoiCy' | 'Schema'

export interface VersaoAplicavelAdmin {
  versaoProvedorId: number
  provedorNome: string
  versaoRotulo: string
}

export interface CampoRelacionadoAdmin {
  campoLayoutId: number
  nome: string
}

/**
 * `ErroAdminDetalhe` — erro é agregado (variantes, versões aplicáveis, campos
 * relacionados viajam juntos, `analise-backend.md` §4.2 nota final). A 001
 * não declara um `GET /interno/erros/{id}` próprio — assumo (contrato
 * declarado, mesmo espírito de `analise-frontend.md` §5.7) que o item de
 * `GET /interno/erros` (I18) já é o agregado completo, suficiente para abrir
 * o modal único de editar sem round-trip adicional.
 */
export interface ErroAdminDetalhe {
  id: number
  codigo: string
  origem: OrigemErro
  titulo: string
  causaProvavel: string | null
  solucaoSugerida: string | null
  variantes: string[]
  versoesAplicaveis: VersaoAplicavelAdmin[]
  camposRelacionados: CampoRelacionadoAdmin[]
  publicado: boolean
  versaoConcorrencia: number
  etag?: string
}

/** Item de `GET /interno/erros` (I18) — mesmo shape do agregado (ver nota acima). */
export type ErroAdminListaItem = ErroAdminDetalhe

/**
 * `CriarErroDto`/`AtualizarErroDto` (I19/I20a). `versoesProvedorIds` pode ser
 * `[]` salvo quando `origem === 'Prefeitura'` (U9) — validado no schema Zod
 * de `ErroForm`, espelhando `CriarErroDtoValidator` do backend.
 */
export interface ErroFormDto {
  codigo: string
  origem: OrigemErro
  titulo: string
  causaProvavel?: string
  solucaoSugerida?: string
  variantes: string[]
  versoesProvedorIds: number[]
  camposLayoutIds: number[]
}
