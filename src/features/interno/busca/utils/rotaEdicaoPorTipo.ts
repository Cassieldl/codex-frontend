/**
 * Onde o editor abre um item que ainda está em rascunho, por tipo de
 * resultado da busca interna.
 *
 * **Limitação conhecida (PQ-09-frontend), deliberada nesta fatia:** o destino
 * é a tela de LISTAGEM do tipo, não o registro. `ResultadoItem` não carrega id
 * numérico (só `chave`/`url`/`slug` textual) e nem toda entidade tem rota de
 * detalhe própria — aviso e erro são editados por modal dentro da lista. Isso
 * ainda obriga o suporte a localizar o item na tela, mas é estritamente melhor
 * que copiar um link público que devolve 404/410, que é o bug corrigido aqui.
 *
 * `aviso` fica de fora de propósito: avisos vivem dentro do detalhe de um
 * provedor/versão, e mandar o editor para a lista de provedores sem dizer qual
 * seria pior que admitir que não há atalho.
 */
const ROTA_EDICAO_POR_TIPO: Record<string, string> = {
  provedor: '/interno/provedores',
  versaoProvedor: '/interno/provedores',
  campoLayout: '/interno/campos-layout',
  erro: '/interno/erros',
  artigo: '/interno/artigos',
}

/** Rota interna de edição do tipo, ou `null` quando não existe atalho para ele. */
export function rotaEdicaoPorTipo(tipo: string): string | null {
  return ROTA_EDICAO_POR_TIPO[tipo] ?? null
}
