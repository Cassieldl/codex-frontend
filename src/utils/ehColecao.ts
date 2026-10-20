/** `Array.isArray` que preserva o tipo do item: o nativo estreita lista `readonly` para `any[]`. */
export function ehColecao<T>(valor: readonly T[] | null | undefined): valor is readonly T[] {
  return Array.isArray(valor)
}
