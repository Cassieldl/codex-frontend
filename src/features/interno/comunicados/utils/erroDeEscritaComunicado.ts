import type { ErroDeCampoApi } from '../../../../utils/handleApiError'
import { extrairErrosDeCampo, handleApiError } from '../../../../utils/handleApiError'
import { extrairCodigoDeErroApi } from '../../utils/codigoDeErroApi'

/**
 * Como o editor sai do erro. Cada valor corresponde a um gesto distinto —
 * dois códigos diferentes nunca compartilham a mesma recuperação, senão a
 * distinção entre eles não chega à tela.
 */
export type AcaoDeRecuperacao = 'recarregar-registro' | 'recarregar-lista' | 'editar-expiracao'

export interface ErroDeEscritaComunicado {
  /** `code` do envelope `{ error: { code, message } }`; `null` fora desse formato. */
  codigo: string | null
  /**
   * Mensagem **do backend**, sempre. Em `COMUNICADO_EXPIRADO` ela é o próprio
   * requisito (decisoes.md B-4: diz o próximo passo) — substituí-la por texto
   * fixo do cliente apagaria a instrução.
   */
  mensagem: string
  /** Campos culpados no 422 de validação — vazio quando o erro não é de campo. */
  errosDeCampo: ErroDeCampoApi[]
  /** Orientação do cliente, somada à mensagem. `null` quando o backend já basta. */
  orientacao: string | null
  acao: AcaoDeRecuperacao | null
  rotuloAcao: string | null
}

interface Recuperacao {
  orientacao: string | null
  acao: AcaoDeRecuperacao
  rotuloAcao: string
}

/**
 * `409 CONFLITO_CONCORRENCIA` e `400 IF_MATCH_OBRIGATORIO` chegam dos mesmos
 * endpoints e são fáceis de confundir, mas têm causas opostas: no primeiro o
 * `If-Match` foi enviado e está **desatualizado** (outra pessoa salvou antes);
 * no segundo ele **não foi enviado** — o registro em mãos veio sem validador de
 * versão. Recarregar o registro resolve um; recarregar a lista, o outro.
 */
const RECUPERACAO_POR_CODIGO: Record<string, Recuperacao> = {
  CONFLITO_CONCORRENCIA: {
    orientacao:
      'Outra pessoa salvou uma alteração depois que você abriu este comunicado. Recarregue o comunicado para ver a versão atual antes de salvar de novo.',
    acao: 'recarregar-registro',
    rotuloAcao: 'Recarregar este comunicado',
  },
  IF_MATCH_OBRIGATORIO: {
    orientacao:
      'O comunicado foi carregado sem o identificador de versão exigido para salvar. Recarregue a lista e abra o comunicado de novo.',
    acao: 'recarregar-lista',
    rotuloAcao: 'Recarregar a lista',
  },
  COMUNICADO_EXPIRADO: {
    // Sem orientação própria de propósito: a mensagem do backend já diz o
    // próximo passo (estender a expiração por I33 e então publicar).
    orientacao: null,
    acao: 'editar-expiracao',
    rotuloAcao: 'Editar expiração',
  },
}

/** Traduz o erro de uma escrita de comunicado (I32-I35) no que a tela precisa mostrar. */
export function interpretarErroDeEscritaComunicado(erro: unknown): ErroDeEscritaComunicado {
  const codigo = extrairCodigoDeErroApi(erro)
  const recuperacao = codigo ? RECUPERACAO_POR_CODIGO[codigo] : undefined

  return {
    codigo,
    mensagem: handleApiError(erro),
    // O 422 de validação traz os campos culpados; sem repassar, o editor lê "um ou mais campos
    // são inválidos" e não sabe qual.
    errosDeCampo: extrairErrosDeCampo(erro),
    orientacao: recuperacao?.orientacao ?? null,
    acao: recuperacao?.acao ?? null,
    rotuloAcao: recuperacao?.rotuloAcao ?? null,
  }
}
