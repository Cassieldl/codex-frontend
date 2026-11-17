// Espelha `arquitetura.md` §4.1 (P9).

import type { TipoArtigo } from '../../artigos/types/artigo'
import type { MarcosDaVersaoLayout } from '../../layout/types/layoutPublico'

export type CategoriaProvedorHome = 'Nacional' | 'Proprio'
export type SeveridadeComunicado = 'Critico' | 'Alerta' | 'Informativo'
export type AbrangenciaComunicado = 'Global' | 'Provedor' | 'ProvedorVersao'

export interface ComunicadoVigenteHome {
  titulo: string
  corpo: string
  severidade: SeveridadeComunicado
  abrangencia: AbrangenciaComunicado
  expiraEm: string
  /** `null` só quando `abrangencia === 'Global'`, nunca por vazamento de rascunho (§5.D.2). */
  provedorNome: string | null
  /** "/provedores/{slug}[/{versao}]"; `null` em `Global` (PQ-15: chip global é texto, sem link). */
  url: string | null
}

export interface ProvedorHomeDto {
  slug: string
  nome: string
  /**
   * Versões publicadas, mais recente primeiro (§5.D.3). A Home não as exibe: a página do
   * provedor abre direto no conteúdo.
   */
  versoes: { slug: string; rotulo: string }[]
  verificadoEm: string | null
  temComunicado: boolean
}

export interface CategoriaProvedoresHome {
  categoria: CategoriaProvedorHome
  total: number
  provedores: ProvedorHomeDto[]
}

/** A origem e os marcos descrevem a versão vigente, no mesmo nível do resumo. */
export interface LayoutResumoHome extends MarcosDaVersaoLayout {
  // SEM `publicadaEm`: a decisão B-6 removeu o campo do contrato e `VersaoResumoMinimaDto` do
  // backend tem exatamente `slug` e `rotulo`. Não existe coluna de data de publicação em
  // `versoeslayout`: exibir `criadoem` sob esse rótulo seria a tela afirmando o que não é verdade.
  vigente: { slug: string; rotulo: string } | null
  prevista: { slug: string; rotulo: string } | null
  descricao: string | null
  camposNovos: number
  camposDescontinuados: number
}

/** Mesmo shape de `ArtigoListaItem` (P7), nunca um gêmeo divergente (arquitetura §4.1). */
export interface ArtigoRecenteHome {
  slug: string
  tipo: TipoArtigo
  titulo: string
  resumo: string | null
  verificadoEm: string | null
}

export interface HomeDto {
  comunicados: ComunicadoVigenteHome[]
  provedoresPorCategoria: CategoriaProvedoresHome[]
  layout: LayoutResumoHome | null
  artigosRecentes: ArtigoRecenteHome[]
}
