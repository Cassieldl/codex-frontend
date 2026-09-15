// Espelha `arquitetura.md` §4.1 (P7/P8), corrigido pela errata M-5 de
// `analise-frontend.md` §0: o valor de contrato de `Mudanca` é ASCII, como
// todos os demais enums do projeto (`Proprio`, `Critico`). O rótulo visível
// "Mudança/Migração" vive só na camada de exibição (`EtiquetaTipoArtigo`).

export type TipoArtigo = 'Conceito' | 'Procedimento' | 'Mudanca'

/** Ordem de exibição das abas/filtros do índice — nunca alfabética. */
export const TIPOS_ARTIGO: readonly TipoArtigo[] = ['Conceito', 'Procedimento', 'Mudanca']

export interface ArtigoListaItem {
  slug: string
  tipo: TipoArtigo
  titulo: string
  /** Derivado no backend (primeiro parágrafo, texto puro). `null` é válido — nunca "—". */
  resumo: string | null
  /** Data pura (`AAAA-MM-DD`), sem hora nem offset — nunca texto já formatado (P-12). */
  verificadoEm: string | null
}

/** `rotulo` é literal fixo no DTO — nomeia a natureza da referência (§7.5 do escopo). */
export interface ReferenciaCampoLayout {
  rotulo: 'CAMPO DO LAYOUT'
  slug: string
  nome: string
  caminhoXml: string
  /** `null` sempre nesta fatia (PQ-06) — a 003 preenche o valor, o componente não muda. */
  url: string | null
}

export interface ReferenciaErro {
  rotulo: 'REJEIÇÃO'
  slug: string
  codigo: string
  titulo: string
  url: string
}

export interface ArtigoDetalhe {
  slug: string
  tipo: TipoArtigo
  titulo: string
  /** Markdown restrito, cru — nunca HTML (D11/E9). Renderizado por `ConteudoArtigo`. */
  corpo: string
  verificadoEm: string | null
  /** `/artigos/{slug}` ou `/como-funciona` quando `reservado` — a URL a exibir/redirecionar. */
  urlCanonica: string
  reservado: boolean
  camposLayoutRelacionados: ReferenciaCampoLayout[]
  errosRelacionados: ReferenciaErro[]
}
