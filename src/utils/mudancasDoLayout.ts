/** "44 campos novos · 20 descontinuados"; `null` quando a versão não mudou nenhum campo. */
export function descreverMudancasDoLayout(
  camposNovos: number,
  camposDescontinuados: number,
): string | null {
  const partes: string[] = []

  if (camposNovos > 0) {
    partes.push(camposNovos > 1 ? `${camposNovos} campos novos` : '1 campo novo')
  }

  if (camposDescontinuados > 0) {
    partes.push(
      camposDescontinuados > 1 ? `${camposDescontinuados} descontinuados` : '1 descontinuado',
    )
  }

  return partes.length > 0 ? partes.join(' · ') : null
}

/** Âncora da seção de novidades em `/layout`; a Home aponta para ela. */
export const ID_NOVIDADES_DO_LAYOUT = 'novidades'
