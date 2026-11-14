const DIACRITICOS = /[̀-ͯ]/g

const RETICENCIAS_NO_FIM = /\s*(?:…|\.\.\.)$/

export interface MensagemDoErro {
  /** A mensagem inteira, que vai no topo da página e no Copiar. */
  principal: string
  /** As mensagens observadas que dizem algo além da principal. */
  outras: string[]
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(DIACRITICOS, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function semPontoFinal(texto: string): string {
  return normalizar(texto).replace(/\.$/, '')
}

/**
 * Decide qual mensagem abre a página do erro. O título vem cortado com "…" quando a mensagem é
 * longa; se uma mensagem observada começa pelo mesmo texto, é ela a mensagem inteira: vai para o
 * topo e sai da lista de baixo. A mensagem igual à principal também sai da lista.
 */
export function resolverMensagemDoErro(erro: {
  titulo: string
  variantes: readonly string[]
}): MensagemDoErro {
  const inicioDoTitulo = RETICENCIAS_NO_FIM.test(erro.titulo)
    ? normalizar(erro.titulo.replace(RETICENCIAS_NO_FIM, ''))
    : ''
  const completa = inicioDoTitulo
    ? erro.variantes.find((variante) => normalizar(variante).startsWith(inicioDoTitulo))
    : undefined

  const principal = completa ?? erro.titulo
  const chaveDaPrincipal = semPontoFinal(principal)

  return {
    principal,
    outras: erro.variantes.filter(
      (variante) => variante !== completa && semPontoFinal(variante) !== chaveDaPrincipal,
    ),
  }
}
