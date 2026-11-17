/**
 * Estado de uma versão do Layout InvoiCy: espelha `EstadoVersaoLayout` do
 * backend (`Codex.Domain/Enums/EstadoVersaoLayout.cs`), que por sua vez espelha
 * `ck_codex_versoeslayout_estado` caractere a caractere. Não confundir com
 * `EstadoCampoLayout` (`Ativo`/`Descontinuado`), que é o estado de um **campo**
 * canônico e vive em `campoLayoutAdmin.ts`.
 */
export type EstadoVersaoLayout = 'Prevista' | 'Vigente' | 'Anterior'

/** Origem normativa e marcos da versão; datas em `yyyy-MM-dd`. */
export interface MarcosDaVersaoLayoutAdmin {
  normaOrigem: string | null
  homologacaoDesde: string | null
  liberadaNoInvoicyEm: string | null
  obrigatoriaEm: string | null
}

/** Marcos no envio. Na edição o PUT substitui os quatro e `null` apaga; na criação, ausente fica vazio. */
export type MarcosDaVersaoLayoutEnvio = Partial<MarcosDaVersaoLayoutAdmin>

/** `VersaoLayoutAdmin`: item de `GET /interno/layout/versoes` (I15a) e resposta de I15b/I15c. */
export interface VersaoLayoutAdmin extends MarcosDaVersaoLayoutAdmin {
  id: number
  rotulo: string
  descricao: string | null
  estado: EstadoVersaoLayout
  ordem: number
  publicado: boolean
  versaoConcorrencia: number
  etag?: string
}

/** `CriarVersaoLayoutDto` (I15b): sem `ordem` (auto-atribuída) e sem `publicado`. */
export interface CriarVersaoLayoutDto extends MarcosDaVersaoLayoutEnvio {
  rotulo: string
  descricao?: string
}

/**
 * `AtualizarVersaoLayoutDto` (I15c): todos os campos opcionais: `ordem` é
 * reordenação editorial explícita (409 se colidir) e `estado` é a transição de
 * `EstadoVersaoLayout` (422 se inválida). Campo ausente permanece como está.
 */
export interface AtualizarVersaoLayoutDto extends MarcosDaVersaoLayoutEnvio {
  rotulo?: string
  descricao?: string
  estado?: EstadoVersaoLayout
  ordem?: number
}
