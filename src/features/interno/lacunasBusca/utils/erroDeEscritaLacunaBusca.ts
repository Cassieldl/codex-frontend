import type { ErroDeCampoApi } from '../../../../utils/handleApiError'
import { extrairErrosDeCampo, handleApiError } from '../../../../utils/handleApiError'
import { extrairCodigoDeErroApi } from '../../utils/codigoDeErroApi'

export interface ErroDeEscritaLacunaBusca {
  /** Mensagem do backend — nos conflitos ela já diz o que aconteceu. */
  mensagem: string
  /** Campos culpados no `422 VALIDATION_ERROR`; vazio quando o erro não é de campo. */
  errosDeCampo: ErroDeCampoApi[]
  /**
   * A linha em tela está velha: outra pessoa já mexeu nela (`409`), ou ela já está no estado pedido
   * (`422 VALIDACAO_NEGOCIO`), ou veio sem validador de versão (`400`). Retentar com os mesmos
   * dados falharia de novo — o caminho é recarregar a fila.
   */
  precisaRecarregarFila: boolean
}

const CODIGOS_DE_LINHA_VELHA = new Set([
  'CONFLITO_CONCORRENCIA',
  'VALIDACAO_NEGOCIO',
  'IF_MATCH_OBRIGATORIO',
])

/** Traduz o erro de uma escrita da fila editorial no que a tela precisa mostrar. */
export function interpretarErroDeEscritaLacunaBusca(erro: unknown): ErroDeEscritaLacunaBusca {
  const codigo = extrairCodigoDeErroApi(erro)

  return {
    mensagem: handleApiError(erro),
    errosDeCampo: extrairErrosDeCampo(erro),
    precisaRecarregarFila: codigo !== null && CODIGOS_DE_LINHA_VELHA.has(codigo),
  }
}
