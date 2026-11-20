import { caminhoInternoSeguro } from '../../../../utils/caminhoInternoSeguro'
import type { ResultadoItem } from '../../../busca/types/resultadoBusca'
import { ORIGENS_LINK, comOrigem } from './origemLink'
import { rotaEdicaoPorTipo } from './rotaEdicaoPorTipo'

/** Caminho que o item merece hoje: o público quando publicado, o de edição quando rascunho. */
export function caminhoDoItemBuscaInterna(item: ResultadoItem): string | null {
  if (item.publicado) return caminhoInternoSeguro(item.url) ?? null
  return rotaEdicaoPorTipo(item.tipo)
}

/**
 * Valor que o "Copiar link" coloca na área de transferência - mesma regra para
 * o clique na tela 11 e para o `Ctrl+Enter` da barra de comando, para a
 * decisão de negócio não existir em dois lugares.
 *
 * O ponto (PQ-09): a busca interna enxerga rascunho, e copiar a URL pública de
 * um conteúdo não publicado manda o parceiro para um 404/410. Item em rascunho
 * copia o link INTERNO de edição; item sem rota de edição não copia nada
 * (`null`) - o chamador mostra o motivo em vez de um botão que engana.
 *
 * `item.url` vem da API e só entra no texto copiado depois de
 * `caminhoInternoSeguro` (BAIXO-04): "@evil.com" concatenado com a origem vira
 * "https://codex.migrate.info@evil.com", cujo host resolvido é evil.com.
 */
export function resolverLinkParaCopiar(item: ResultadoItem, urlBase: string): string | null {
  const caminho = caminhoDoItemBuscaInterna(item)
  if (!caminho) return null
  return `${urlBase}${comOrigem(caminho, ORIGENS_LINK.atendimento)}`
}
