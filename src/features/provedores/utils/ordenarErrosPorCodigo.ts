const COMPARADOR_NATURAL = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })

/** Ordem crescente de código, com os números comparados como números: E2 vem antes de E10. */
export function ordenarErrosPorCodigo<Erro extends { codigo: string }>(
  erros: readonly Erro[],
): Erro[] {
  return [...erros].sort((a, b) => COMPARADOR_NATURAL.compare(a.codigo, b.codigo))
}
