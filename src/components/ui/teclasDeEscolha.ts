const TECLAS_DE_AVANCO = new Set(['ArrowRight', 'ArrowDown'])
const TECLAS_DE_RECUO = new Set(['ArrowLeft', 'ArrowUp'])

/**
 * Índice da opção que a tecla escolhe num grupo de rádio, com volta nas pontas; `null` para
 * teclas que não mudam a escolha.
 */
export function indiceDaTecla(tecla: string, atual: number, total: number): number | null {
  if (TECLAS_DE_AVANCO.has(tecla)) return (atual + 1) % total
  if (TECLAS_DE_RECUO.has(tecla)) return (atual - 1 + total) % total
  if (tecla === 'Home') return 0
  if (tecla === 'End') return total - 1
  return null
}
