// Espelha `arquitetura.md` §4.1 (P9), com a correção de contrato registrada
// em `decisoes.md` (Rodada 4, item 1 — resolve F-1 de `analise-frontend.md`
// §0): `ProvedorHomeDto.outrasVersoes: number` foi substituído pela lista
// completa de versões, porque um número não sustenta o `<Select>` de versão
// do widget "escolha o provedor → escolha a versão" (artboard da Home). O
// dado já existe em P2 (`ProvedorListaItem.versoes`) — custo zero para o
// backend. `ultimaVersao` é `versoes[0]`; a contagem de "outras" é
// `versoes.length - 1` — ambos derivados no cliente (FRONT-B), nunca
// duplicados aqui.

export type CategoriaProvedorHome = 'Nacional' | 'Proprio'
export type SeveridadeComunicado = 'Critico' | 'Alerta' | 'Informativo'
export type AbrangenciaComunicado = 'Global' | 'Provedor' | 'ProvedorVersao'

export interface ComunicadoVigenteHome {
  titulo: string
  corpo: string
  severidade: SeveridadeComunicado
  abrangencia: AbrangenciaComunicado
  expiraEm: string
  /** `null` só quando `abrangencia === 'Global'` — nunca por vazamento de rascunho (§5.D.2). */
  provedorNome: string | null
  /** "/provedores/{slug}[/{versao}]"; `null` em `Global` (PQ-15 — chip global é texto, sem link). */
  url: string | null
}

export interface ProvedorHomeDto {
  slug: string
  nome: string
  /**
   * Lista completa de versões publicadas, já ordenada (mais recente
   * primeiro, mesma ordem de §5.D.3) — ver nota de topo sobre F-1.
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

export interface LayoutResumoHome {
  // SEM `publicadaEm`: a decisão B-6 removeu o campo do contrato e `VersaoResumoMinimaDto` do
  // backend tem exatamente `slug` e `rotulo`. Não existe coluna de data de publicação em
  // `versoeslayout` — exibir `criadoem` sob esse rótulo seria a tela afirmando o que não é verdade.
  vigente: { slug: string; rotulo: string } | null
  prevista: { slug: string; rotulo: string } | null
  descricao: string | null
  camposNovos: number
  camposDescontinuados: number
}

/** Mesmo shape de `ArtigoListaItem` (P7) — nunca um gêmeo divergente (arquitetura §4.1). */
export interface ArtigoRecenteHome {
  slug: string
  tipo: 'Conceito' | 'Procedimento' | 'Mudanca'
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
