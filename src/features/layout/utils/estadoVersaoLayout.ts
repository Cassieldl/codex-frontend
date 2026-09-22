import type { EstadoVersaoLayout } from '../types/layoutPublico'

/**
 * Estado de versão de layout se distingue por **forma da borda** e pelo rótulo
 * por extenso, nunca por cor (mesma gramática de `EtiquetaEstado`/M34 já
 * estabelecida no projeto): borda cheia e grossa = vigente, tracejada e grossa
 * = prevista, fio fino = anterior. Mapa único, compartilhado pelo chip de
 * seleção e pelo histórico, para as duas superfícies nunca divergirem.
 */
export const BORDA_POR_ESTADO_VERSAO: Record<EstadoVersaoLayout, string> = {
  Vigente: 'border-[2.5px] border-solid border-primary',
  Prevista: 'border-[2.5px] border-dashed border-primary',
  Anterior: 'border border-solid border-border',
}

/** Frase da legenda — a forma só informa quem já sabe lê-la; o texto explica. */
export const LEGENDA_ESTADO_VERSAO =
  'Borda cheia e grossa: vigente. Tracejada e grossa: prevista. Fio fino: anterior.'
