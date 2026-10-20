/** Um alias por linha, aparado e sem vazias: o mesmo recorte do envio, para validar o que o servidor recebe. */
export function separarAliases(texto: string | undefined): string[] {
  return (texto ?? '')
    .split('\n')
    .map((alias) => alias.trim())
    .filter(Boolean)
}
