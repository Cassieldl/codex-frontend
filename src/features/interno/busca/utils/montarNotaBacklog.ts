export interface DadosNotaBacklog {
  termo: string
  parceiro: string
  chamado: string
  dataFormatada: string
}

/**
 * D4/M16 — monta o texto de "copiar nota para o backlog". Nunca envia nada ao
 * backend (U2, escrita anônima proibida na 001) — só compõe uma string para
 * a área de transferência.
 */
export function montarNotaBacklog({
  termo,
  parceiro,
  chamado,
  dataFormatada,
}: DadosNotaBacklog): string {
  const parceiroFinal = parceiro.trim() || 'sem parceiro informado'
  const chamadoFinal = chamado.trim() || 'sem chamado informado'
  return `${termo} · ${parceiroFinal} · ${chamadoFinal} · ${dataFormatada}`
}
