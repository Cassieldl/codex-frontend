/** Campos visíveis por bloco antes do "Mostrar todos". */
export const CAMPOS_VISIVEIS_POR_BLOCO = 10

interface SubgrupoComCampos<TCampo> {
  campos: TCampo[]
}

export interface RecorteDoBloco<TSubgrupo> {
  subgrupos: TSubgrupo[]
  ocultos: number
}

/**
 * Os primeiros `limite` campos do bloco, na ordem dos subgrupos. Subgrupo que fica sem campo some
 * do recorte, para não sobrar subtítulo vazio.
 */
export function recortarCamposDoBloco<TCampo, TSubgrupo extends SubgrupoComCampos<TCampo>>(
  subgrupos: TSubgrupo[],
  limite = CAMPOS_VISIVEIS_POR_BLOCO,
): RecorteDoBloco<TSubgrupo> {
  let restantes = limite
  let ocultos = 0
  const visiveis: TSubgrupo[] = []

  for (const subgrupo of subgrupos) {
    const mostrados = subgrupo.campos.slice(0, Math.max(restantes, 0))
    ocultos += subgrupo.campos.length - mostrados.length
    restantes -= mostrados.length
    if (mostrados.length > 0) visiveis.push({ ...subgrupo, campos: mostrados })
  }

  return { subgrupos: visiveis, ocultos }
}
