import type { TipoArtigo } from '../../../artigos/types/artigo'

export type { TipoArtigo }

/**
 * Item de `GET /interno/artigos` (I23) - compacto, **sem** `corpo` nem as
 * coleções de referência cruzada. Shape conferido contra
 * `ArtigoAdminListaItemDto` do backend real: listagem nunca carrega texto
 * livre em toda linha da página (`decisoes.md` B-1, item 1).
 */
export interface ArtigoAdminListaItem {
  id: number
  slug: string
  /** Valor de contrato ASCII (M-5) - o rótulo "Mudança" vive só na exibição. */
  tipo: TipoArtigo
  titulo: string
  publicado: boolean
  /** Espelha `SlugsReservadosArtigo.EhReservado` do backend - nunca calculado no cliente. */
  reservado: boolean
  /** Data pura (`AAAA-MM-DD`), nunca `DateTimeOffset` - o artigo só mostra data. */
  verificadoEm: string | null
  versaoConcorrencia: number
  etag?: string
}

/** Erro vinculado ao artigo. `desativado` marca o erro removido, que segue vinculado até o editor tirá-lo. */
export interface ErroVinculadoArtigo {
  id: number
  codigo: string
  titulo: string
  desativado: boolean
}

/** Campo do layout vinculado ao artigo, com a versão do layout a que pertence. */
export interface CampoLayoutVinculadoArtigo {
  id: number
  nome: string
  caminhoXml: string
  versaoLayoutId: number
  versaoLayoutRotulo: string
  desativado: boolean
}

/**
 * Detalhe (I24, e resposta de I25/I26/I28/I29): estende o item de lista com `corpo` e os vínculos.
 * Os ids brutos são o que o formulário envia; `erros` e `camposLayout` trazem os mesmos vínculos
 * rotulados, para o editor ver o que já está gravado mesmo fora do resultado da busca.
 */
export interface ArtigoAdminDetalhe extends ArtigoAdminListaItem {
  corpo: string
  campoLayoutIds: number[]
  erroIds: number[]
  erros: ErroVinculadoArtigo[]
  camposLayout: CampoLayoutVinculadoArtigo[]
}

/**
 * `CriarArtigoDto`/`AtualizarArtigoDto` (I25/I26). `slug` **não** é campo de
 * escrita - é derivado do título no backend, e para o artigo reservado
 * `SlugsReservadosArtigo` garante que renomear o título nunca muda o slug.
 * `publicado` também não viaja: publicação só muda por I28 (M19).
 *
 * `tipo` **é** editável (`decisoes.md` B-2) e a troca dispara reindexação - o
 * consumidor é o editor que classificou errado, e a alternativa (apagar e
 * recriar) quebraria uma URL pública viva.
 */
export interface ArtigoFormDto {
  titulo: string
  tipo: TipoArtigo
  corpo: string
  campoLayoutIds: number[]
  erroIds: number[]
}

/** Resposta de `GET /interno/artigos/existe?slug=` (I36) - resolução de F-2. */
export interface ArtigoExiste {
  slug: string
  existe: boolean
  artigoId: number | null
}
