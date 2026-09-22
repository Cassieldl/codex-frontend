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
 * **Limitação conhecida (PQ-09-frontend / F-3), deliberada nesta fatia:** o
 * destino é a tela de LISTAGEM do tipo, não o registro. Levar ao registro é
 * impossível com o contrato atual, por dois motivos independentes:
 *
 * 1. `ResultadoItem` não carrega id numérico — só `chave`, `url` e o slug
 *    implícito na `url`. Sem id não se monta `/interno/provedores/{id}`.
 * 2. Quatro dos seis tipos não têm rota de detalhe própria: `aviso`, `erro`,
 *    `artigo` e `campoLayout` são editados por modal dentro da listagem. Só
 *    `provedor` e `versaoProvedor` têm URL de registro.
 *
 * Em vez de fingir a precisão que os dados não sustentam, a limitação é dita
 * na interface: `nomeDaLista` alimenta o `aria-label` de "Copiar link interno"
 * (`LinhaResultadoBuscaInterna`), que explicita "leva à listagem de X, não ao
 * registro". Mudar o destino exige contrato novo (id em `ResultadoItem` e
 * rotas de detalhe para os quatro tipos) — próxima fatia, não esta.
 *
 * `aviso` entra na tabela com `rota: null` de propósito, em vez de ficar de
 * fora: avisos vivem dentro do detalhe de um provedor/versão, e mandar o
 * editor para a lista de provedores sem dizer qual seria pior que admitir que
 * não há atalho. Estar na tabela mantém o nome da lista disponível e deixa a
 * ausência explícita, não implícita.
 */
const DESTINO_EDICAO_POR_TIPO: Record<string, DestinoEdicao> = {
  provedor: { rota: '/interno/provedores', nomeDaLista: 'provedores' },
  versaoProvedor: { rota: '/interno/provedores', nomeDaLista: 'versões de provedor' },
  campoLayout: { rota: '/interno/campos-layout', nomeDaLista: 'campos do layout' },
  erro: { rota: '/interno/erros', nomeDaLista: 'erros conhecidos' },
  artigo: { rota: '/interno/artigos', nomeDaLista: 'artigos' },
  aviso: { rota: null, nomeDaLista: 'avisos' },
}

/** Rota interna de edição do tipo, ou `null` quando não existe atalho para ele. */
export function rotaEdicaoPorTipo(tipo: string): string | null {
  return DESTINO_EDICAO_POR_TIPO[tipo]?.rota ?? null
}

/**
 * Nome da listagem interna do tipo, em português e no plural, para uso em
 * texto lido por leitor de tela.
 *
 * Total de propósito: tipo desconhecido devolve a própria chave em vez de
 * `null`. O contrato de `ResultadoItem.tipo` é `string` (não um enum fechado),
 * então um tipo novo no backend chega aqui sem aviso — e uma frase com o nome
 * técnico ("leva à listagem de comunicado") continua verdadeira e legível,
 * enquanto um `null` interpolado viraria a palavra "null" na tela.
 */
export function nomeDaListaPorTipo(tipo: string): string {
  return DESTINO_EDICAO_POR_TIPO[tipo]?.nomeDaLista ?? tipo
}
