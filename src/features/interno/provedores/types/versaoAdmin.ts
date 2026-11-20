import type { AvisoAdmin } from './avisoAdmin'

/** `GET /interno/provedores/{id}/versoes` (I6) - item de `ApiResponse<T[]>`. `versaoConcorrencia` embutido no item (ver nota em `ProvedorAdminListaItem`). */
export interface VersaoAdminListaItem {
  id: number
  rotulo: string
  verificadoEm: string | null
  publicado: boolean
  versaoConcorrencia: number
  etag?: string
}

/**
 * `GET /interno/versoes/{id}` (I8a). Espelha `ProvedorAdminDetalhe` - embute
 * todos os avisos **desta versão** (publicados e rascunho), simetricamente à
 * nota de I2 (contrato assumido, declarado aqui - `analise-backend.md` não
 * detalha o shape completo de `VersaoAdminDetalhe`).
 */
export interface VersaoAdminDetalhe {
  id: number
  provedorId: number
  versaoLayoutId: number
  rotulo: string
  introducao: string | null
  verificadoEm: string | null
  publicado: boolean
  avisos: AvisoAdmin[]
  versaoConcorrencia: number
  etag?: string
}

/** `CriarVersaoDto` (I7). */
export interface CriarVersaoDto {
  versaoLayoutId: number
  rotulo: string
  introducao?: string
}

/** `AtualizarVersaoDto` (I8b) - sem `publicado`/`verificadoEm` (endpoints dedicados). */
export interface AtualizarVersaoDto {
  rotulo: string
  introducao?: string
}
