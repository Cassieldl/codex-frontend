import type { EstadoPreenchimentoCampo } from '../types/versaoProvedorPagina'

export const ROTULO_DA_OBRIGATORIEDADE: Record<EstadoPreenchimentoCampo, string> = {
  Obrigatorio: 'Obrigatório',
  Condicional: 'Condicional',
  Opcional: 'Opcional',
}

/** Ordem em que a obrigatoriedade aparece na legenda: do mais exigente ao menos. */
export const ORDEM_DA_OBRIGATORIEDADE: EstadoPreenchimentoCampo[] = [
  'Obrigatorio',
  'Condicional',
  'Opcional',
]
