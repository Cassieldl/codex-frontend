export type SeveridadeAviso = 'Critico' | 'Alerta' | 'Informativo'
export type EscopoAviso = 'provedor' | 'versao'

/**
 * Aviso na área interna — U8/`analise-backend.md` §4.2 (I14a/I14a2/I14b/I14c/I14d).
 * `escopo` nunca muda depois de criado (o `id` já identifica um aviso com
 * escopo fixo) — determinado pela rota em que o aviso foi criado, nunca por
 * um campo de formulário (§5.7). `camposAfetados` só existe de fato quando
 * `escopo === 'versao'`.
 */
export interface AvisoAdmin {
  id: number
  severidade: SeveridadeAviso
  titulo: string
  corpo: string
  vigenciaInicio: string | null
  escopo: EscopoAviso
  camposAfetados: string[]
  publicado: boolean
  versaoConcorrencia: number
  etag?: string
}

/** `CriarAvisoDeVersaoDto` (I14a) — escopo `versao`, aceita `campoVersaoIds`. */
export interface CriarAvisoDeVersaoDto {
  severidade: SeveridadeAviso
  titulo: string
  corpo: string
  vigenciaInicio?: string
  campoVersaoIds: number[]
}

/**
 * `CriarAvisoDeProvedorDto` (I14a2) — escopo `provedor`. **Sem** `campoVersaoIds`
 * (a propriedade nem existe no tipo — impede a violação por construção do DTO,
 * mesmo princípio do backend real, `analise-backend.md` §4.2 nota I14a2).
 */
export interface CriarAvisoDeProvedorDto {
  severidade: SeveridadeAviso
  titulo: string
  corpo: string
  vigenciaInicio?: string
}

/** `AtualizarAvisoDto` (I14b) — única rota de atualização para os dois escopos. */
export interface AtualizarAvisoDto {
  severidade: SeveridadeAviso
  titulo: string
  corpo: string
  vigenciaInicio?: string
  campoVersaoIds?: number[]
}
