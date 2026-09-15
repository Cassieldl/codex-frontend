/** `campolayout` (área interna) — a lista é sempre por versão de layout (I16). */
export const camposLayoutKeys = {
  all: ['camposLayoutAdmin'] as const,
  porVersaoLayout: (versaoLayoutId: number) =>
    ['camposLayoutAdmin', 'porVersaoLayout', versaoLayoutId] as const,
}
