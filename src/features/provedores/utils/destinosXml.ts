export const SEPARADOR_DE_DESTINOS = ' | '

/** Marcador que a carga grava no lugar dos destinos que não couberam em `destinoXml`. */
export const MARCADOR_DE_DESTINOS_OMITIDOS = '…'

export type DestinoDoCampo =
  { tipo: 'caminho'; caminho: string; niveis: string[]; tag: string } | { tipo: 'omitidos' }

/** `'DPS/infDPS/vServ'` → `['DPS', 'infDPS', 'vServ']`. Segmento vazio é descartado. */
export function niveisDoCaminho(caminho: string): string[] {
  return caminho.split('/').filter(Boolean)
}

/** Último nível do caminho: o nome da tag que recebe o valor. */
export function nomeDaTag(caminho: string): string {
  return niveisDoCaminho(caminho).at(-1) ?? ''
}

/** Separa `destinoXml` em um destino por tag do provedor. */
export function separarDestinos(destinoXml: string | null): DestinoDoCampo[] {
  if (!destinoXml) return []

  return destinoXml
    .split(SEPARADOR_DE_DESTINOS)
    .map((item) => item.trim())
    .filter((item) => item !== '')
    .map((item): DestinoDoCampo => {
      if (item === MARCADOR_DE_DESTINOS_OMITIDOS) return { tipo: 'omitidos' }
      return { tipo: 'caminho', caminho: item, niveis: niveisDoCaminho(item), tag: nomeDaTag(item) }
    })
}
