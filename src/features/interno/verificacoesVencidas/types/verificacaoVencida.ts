/** `ProvedorVerificacaoVencidaDto` do backend. */
export interface ProvedorDaVerificacaoVencida {
  id: number
  nome: string
  slug: string
}

/**
 * `VerificacaoVencidaDto` do backend. `verificadoEm` é data sem horário (`DateOnly`,
 * `yyyy-MM-dd`); `null` junto com `diasDesdeVerificacao` quando a versão nunca foi verificada.
 */
export interface VerificacaoVencida {
  versaoId: number
  rotulo: string
  slug: string
  provedor: ProvedorDaVerificacaoVencida
  verificadoEm: string | null
  diasDesdeVerificacao: number | null
  publicado: boolean
  /** Rota da tela da versão na área interna (`/interno/provedores/{id}/versoes/{id}`). */
  urlInterna: string
}

/** Faixa aceita pelo servidor para `dias` (fora dela: 422). */
export const LIMITES_DIAS_VERIFICACAO = { minimo: 1, maximo: 3650 } as const

export const DIAS_VERIFICACAO_PADRAO = 90

export const OPCOES_DIAS_VERIFICACAO = [30, 60, 90, 180] as const
