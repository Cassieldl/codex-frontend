export type CategoriaProvedor = 'Nacional' | 'Proprio'
export type SeveridadeAviso = 'Critico' | 'Alerta' | 'Informativo'
export type EscopoAviso = 'provedor' | 'versao'

/**
 * `analise-frontend.md` §5.7 — aviso de provedor e de versão compartilham o
 * mesmo tipo. `escopo` é quem distingue (nunca a cor — §3.3b/U8).
 * `camposAfetados` é sempre `[]` quando `escopo === 'provedor'`.
 */
export interface AvisoPublico {
  severidade: SeveridadeAviso
  titulo: string
  corpo: string
  vigenciaInicio: string
  escopo: EscopoAviso
  camposAfetados: string[]
}

/** Item de `ProvedorDetalhe.versoes` (P3, `analise-backend.md` §4.1) — nunca marca "vigente" (U7). */
export interface VersaoProvedorResumo {
  slug: string
  rotulo: string
  verificadoEm: string | null
  url: string
}

/** `GET /provedores/{provedorSlug}` (P3) — `ApiResponse<ProvedorDetalhe>`. */
export interface ProvedorDetalhe {
  slug: string
  nome: string
  categoria: CategoriaProvedor
  identificadorInvoicy: string
  avisos: AvisoPublico[]
  versoes: VersaoProvedorResumo[]
}

/**
 * Item de `GET /provedores` (P2) — shape declarado em `analise-frontend.md`
 * §5.7 (assumido, pendente de confirmação do Analista Backend).
 */
export interface ProvedorListaItem {
  slug: string
  nome: string
  categoria: CategoriaProvedor
  verificadoEm: string | null
  versoes: { slug: string; rotulo: string }[]
}
