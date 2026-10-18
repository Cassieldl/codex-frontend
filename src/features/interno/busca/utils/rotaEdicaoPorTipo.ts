import type { TipoResultado } from '../../../busca/types/resultadoBusca'

interface DestinoEdicao {
  /** Rota interna que o editor abre, ou `null` quando não existe atalho. */
  rota: string | null
  /** Nome da listagem no plural, para dizer em voz alta onde o link vai cair. */
  nomeDaLista: string
}

/**
 * Onde o editor abre um item que ainda está em rascunho, por tipo de
 * resultado da busca interna.
 *
 * O destino é a tela de LISTAGEM do tipo, não o registro: `ResultadoItem` não
 * carrega id numérico, e `aviso`, `erro`, `artigo` e `campolayout` são
 * editados por modal dentro da listagem. A limitação é dita na interface:
 * `nomeDaLista` alimenta o `aria-label` de "Copiar link interno", que
 * explicita "leva à listagem de X, não ao registro".
 *
 * `aviso` entra com `rota: null` de propósito: avisos vivem dentro do detalhe
 * de um provedor ou versão, e mandar o editor para a lista de provedores sem
 * dizer qual seria pior que admitir que não há atalho.
 *
 * As chaves são os valores que a API envia em `tipo` (`TipoResultado`): o
 * `Record` exige uma entrada para cada um deles.
 */
const DESTINO_EDICAO_POR_TIPO: Record<TipoResultado, DestinoEdicao> = {
  provedor: { rota: '/interno/provedores', nomeDaLista: 'provedores' },
  versaoprovedor: { rota: '/interno/provedores', nomeDaLista: 'versões de provedor' },
  campolayout: { rota: '/interno/campos-layout', nomeDaLista: 'campos do layout' },
  erro: { rota: '/interno/erros', nomeDaLista: 'erros conhecidos' },
  artigo: { rota: '/interno/artigos', nomeDaLista: 'artigos' },
  aviso: { rota: null, nomeDaLista: 'avisos' },
}

function destinoDoTipo(tipo: string): DestinoEdicao | undefined {
  if (!Object.hasOwn(DESTINO_EDICAO_POR_TIPO, tipo)) return undefined
  return DESTINO_EDICAO_POR_TIPO[tipo as TipoResultado]
}

/** Rota interna de edição do tipo, ou `null` quando não existe atalho para ele. */
export function rotaEdicaoPorTipo(tipo: string): string | null {
  return destinoDoTipo(tipo)?.rota ?? null
}

/**
 * Nome da listagem interna do tipo, em português e no plural, para uso em
 * texto lido por leitor de tela.
 *
 * Tipo desconhecido devolve a própria chave em vez de `null`: um tipo novo no
 * backend chega aqui sem aviso, e "leva à listagem de comunicado" continua
 * legível, enquanto um `null` interpolado viraria a palavra "null" na tela.
 */
export function nomeDaListaPorTipo(tipo: string): string {
  return destinoDoTipo(tipo)?.nomeDaLista ?? tipo
}
