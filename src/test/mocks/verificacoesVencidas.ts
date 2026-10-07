/**
 * JSON literal transcrito de `VerificacaoVencidaDto` (`codex-backend`, `VerificacaoVencidaDtos.cs`),
 * como o servidor serializa. Sem anotação com o tipo do cliente, de propósito: tipar o mock pela
 * interface do front faria o compilador forçar o mock a ter a forma que o cliente acredita, e o
 * teste confirmaria o mock em vez do contrato.
 */

/** Nunca verificada e ainda em rascunho: vem antes na ordem do servidor. */
export const VERSAO_NUNCA_VERIFICADA = {
  versaoId: 12,
  rotulo: '2.0 Rascunho',
  slug: '2-0-rascunho',
  provedor: { id: 3, nome: 'Provedor X', slug: 'provedor-x' },
  verificadoEm: null,
  diasDesdeVerificacao: null,
  publicado: false,
  urlInterna: '/interno/provedores/3/versoes/12',
}

export const VERSAO_VERIFICADA_HA_90_DIAS = {
  versaoId: 11,
  rotulo: '1.0 Contrato',
  slug: '1-0-contrato',
  provedor: { id: 3, nome: 'Provedor X', slug: 'provedor-x' },
  verificadoEm: '2026-07-07',
  diasDesdeVerificacao: 90,
  publicado: true,
  urlInterna: '/interno/provedores/3/versoes/11',
}

export const VERSAO_VERIFICADA_HA_200_DIAS = {
  versaoId: 8,
  rotulo: '3.1 Municipal',
  slug: '3-1-municipal',
  provedor: { id: 5, nome: 'Provedor Y', slug: 'provedor-y' },
  verificadoEm: '2026-03-19',
  diasDesdeVerificacao: 200,
  publicado: true,
  urlInterna: '/interno/provedores/5/versoes/8',
}

/** `PaginatedResponse<VerificacaoVencidaDto>`: cru na raiz, sem envelope `data`. */
export function respostaListaVerificacoesVencidas(
  items: object[],
  extras: Partial<{ totalCount: number; page: number; pageSize: number; totalPages: number }> = {},
) {
  return {
    items,
    totalCount: items.length,
    page: 1,
    pageSize: 25,
    totalPages: Math.max(1, Math.ceil(items.length / 25)),
    ...extras,
  }
}
