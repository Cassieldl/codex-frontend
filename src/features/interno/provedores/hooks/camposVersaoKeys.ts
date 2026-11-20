/** `camposversao` (área interna) - lista sempre por versão (I11, `incluirAusentes` variando). */
export const camposVersaoKeys = {
  all: ['camposVersaoAdmin'] as const,
  porVersao: (versaoId: number, incluirAusentes: boolean) =>
    ['camposVersaoAdmin', 'porVersao', versaoId, incluirAusentes] as const,
}
