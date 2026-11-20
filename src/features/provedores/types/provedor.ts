export type CategoriaProvedor = 'Nacional' | 'Proprio'
export type SeveridadeAviso = 'Critico' | 'Alerta' | 'Informativo'
export type EscopoAviso = 'provedor' | 'versao'

/**
 * Campo de layout apontado por um aviso de versão - o bastante para rotular e linkar à linha da
 * tabela (`#campo-{campoLayoutSlug}`).
 */
export interface CampoAfetadoPublico {
  campoLayoutSlug: string
  nome: string
  caminhoXml: string
}

/**
 * Aviso de provedor (P3) ou de versão (P4) - mesmo tipo; `escopo` é quem distingue (nunca a cor,
 * U8). `id` dá a âncora própria (`#aviso-{id}`). `vigenciaInicio` é data sem horário
 * (`yyyy-MM-dd`). `camposAfetados` é sempre presente: `[]` para aviso de provedor e para aviso de
 * versão sem campos apontados.
 */
export interface AvisoPublico {
  id: number
  escopo: EscopoAviso
  severidade: SeveridadeAviso
  titulo: string
  corpo: string
  vigenciaInicio: string
  camposAfetados: CampoAfetadoPublico[]
}

/** Item de `ProvedorDetalhe.versoes` (P3, `analise-backend.md` §4.1) - nunca marca "vigente" (U7). */
export interface VersaoProvedorResumo {
  slug: string
  rotulo: string
  verificadoEm: string | null
  url: string
}

/** `GET /provedores/{provedorSlug}` (P3) - `ApiResponse<ProvedorDetalhe>`. */
export interface ProvedorDetalhe {
  slug: string
  nome: string
  categoria: CategoriaProvedor
  identificadorInvoicy: string
  avisos: AvisoPublico[]
  versoes: VersaoProvedorResumo[]
}

/**
 * Item de `GET /provedores` (P2) - shape declarado em `analise-frontend.md`
 * §5.7 (assumido, pendente de confirmação do Analista Backend).
 */
export interface ProvedorListaItem {
  slug: string
  nome: string
  categoria: CategoriaProvedor
  verificadoEm: string | null
  versoes: { slug: string; rotulo: string }[]
}
