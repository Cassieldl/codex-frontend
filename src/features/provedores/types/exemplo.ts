/** `ExemploPublicoDto` (P4, arquitetura §4.2/C4) — sempre presente em `VersaoProvedorPagina.exemplos`, `[]` quando não há. */
export interface ExemploPublico {
  slug: string
  nome: string
  descricao: string | null
  xml: string
}
