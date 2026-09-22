export type SeveridadeComunicado = 'Critico' | 'Alerta' | 'Informativo'
export type AbrangenciaComunicado = 'Global' | 'Provedor' | 'ProvedorVersao'

/**
 * Item de `GET /interno/comunicados` (I30) — compacto, **sem** `corpo` nem os
 * ids brutos de escopo: listagem não carrega texto livre (`analise-frontend.md`
 * §1.3, conferido contra `ComunicadoAdminListaItemDto` do backend real).
 */
export interface ComunicadoAdminListaItem {
  id: number
  titulo: string
  severidade: SeveridadeComunicado
  abrangencia: AbrangenciaComunicado
  provedorNome: string | null
  versaoRotulo: string | null
  /** ISO-8601 com offset, como o backend serializa `DateTimeOffset`. */
  expiraEm: string
  publicado: boolean
  /**
   * Derivado na LEITURA (`expiraEm <= agora`), nunca persistido — e nunca
   * confundido com `publicado`: os dois são independentes, e as quatro
   * combinações existem (rascunho vigente, rascunho encerrado, publicado
   * vigente, publicado encerrado).
   */
  encerrado: boolean
  versaoConcorrencia: number
  etag?: string
}

/**
 * Detalhe (I31, e resposta de I32/I33/I35) — **não** é alias do item de lista:
 * estende com `corpo`, `provedorId` e `versaoProvedorId`. Sem os três, o modal
 * de edição abre com o textarea vazio e os selects sem opção pré-selecionada.
 */
export interface ComunicadoAdminDetalhe extends ComunicadoAdminListaItem {
  corpo: string
  provedorId: number | null
  versaoProvedorId: number | null
}

/**
 * `CriarComunicadoDto`/`AtualizarComunicadoDto` (I32/I33). `publicado` **não** é
 * campo de escrita: publicação só muda por I35 (M19). `provedorId`/
 * `versaoProvedorId` só viajam quando a abrangência os exige — o CHECK
 * `ck_codex_comunicados_abrangencia_consistente` recusa a combinação errada.
 */
export interface ComunicadoFormDto {
  titulo: string
  corpo: string
  severidade: SeveridadeComunicado
  abrangencia: AbrangenciaComunicado
  provedorId?: number
  versaoProvedorId?: number
  /** ISO-8601 com offset. Obrigatório (M-3) e sempre no futuro, inclusive na edição. */
  expiraEm: string
  /**
   * Só I32 (D-1/G1). Nunca é campo de UI no `ComunicadoForm` — quem o define é
   * `PublicarComunicadoGlobal`, condicionado à role `comunicados-publicar`.
   * Ausente equivale a `false` no backend: cria em rascunho. Enviar `true` sem
   * a role é `403`, nunca criação silenciosa em rascunho.
   */
  publicar?: boolean
}
