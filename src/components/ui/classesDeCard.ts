/** Card do design system: raio de 16px e borda leve, os dois vindos de token. */
export const CLASSE_CARD = 'rounded-[var(--radius-card)] border border-border bg-white'

/** Hover do card que é um link inteiro: borda azul, sombra mais forte e o card sobe 2px. */
export const CLASSE_HOVER_DO_CARD_CLICAVEL =
  'transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:border-primary-light hover:shadow-panel'

export const CLASSE_CARD_CLICAVEL = `${CLASSE_CARD} ${CLASSE_HOVER_DO_CARD_CLICAVEL}`
