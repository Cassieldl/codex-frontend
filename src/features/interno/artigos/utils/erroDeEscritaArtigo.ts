import type { ErroDeCampoApi } from '../../../../utils/handleApiError'
import { extrairErrosDeCampo } from '../../../../utils/handleApiError'
import { extrairCodigoDeErroApi } from '../../utils/codigoDeErroApi'
import { mensagemDeErroDeEscrita } from '../../utils/mensagemDeErroDeEscrita'
import type { OrigemDaEscrita } from '../../utils/mensagemDeErroDeEscrita'

/** Como o editor sai do erro. Cada valor corresponde a um gesto distinto na tela. */
export type AcaoDeRecuperacaoArtigo = 'recarregar-registro' | 'recarregar-lista'

export interface ErroDeEscritaArtigo {
  /** `code` do envelope `{ error: { code, message } }`; `null` fora desse formato. */
  codigo: string | null
  /** Mensagem do backend, sempre — nunca substituída por texto fixo do cliente. */
  mensagem: string
  /** Campos culpados no 422 de validação — vazio quando o erro não é de campo. */
  errosDeCampo: ErroDeCampoApi[]
  /** Orientação do cliente, somada à mensagem. `null` quando o backend já basta. */
  orientacao: string | null
  acao: AcaoDeRecuperacaoArtigo | null
  rotuloAcao: string | null
}

interface Recuperacao {
  orientacao: string | null
  acao: AcaoDeRecuperacaoArtigo | null
  rotuloAcao: string | null
}

/**
 * `409 CONFLITO_CONCORRENCIA` e `400 IF_MATCH_OBRIGATORIO` chegam dos mesmos
 * endpoints e são fáceis de confundir, mas têm causas opostas: no primeiro o
 * `If-Match` foi enviado e está **desatualizado** (outra pessoa salvou antes);
 * no segundo ele **não foi enviado** — o registro em mãos veio sem validador
 * de versão. Recarregar o registro resolve um; recarregar a lista, o outro.
 *
 * `422 ARTIGO_RESERVADO` não tem ação de recuperação de propósito: não existe
 * gesto que faça a remoção passar. A tela já desabilita remover/despublicar
 * pelo campo `reservado`; este ramo é a rede de segurança do servidor, e o que
 * falta ao editor é a explicação, não um botão.
 */
const RECUPERACAO_POR_CODIGO: Record<string, Recuperacao> = {
  CONFLITO_CONCORRENCIA: {
    orientacao:
      'Outra pessoa salvou uma alteração depois que você abriu este artigo. Recarregue o artigo para ver a versão atual antes de salvar de novo.',
    acao: 'recarregar-registro',
    rotuloAcao: 'Recarregar este artigo',
  },
  IF_MATCH_OBRIGATORIO: {
    orientacao:
      'O artigo foi carregado sem o identificador de versão exigido para salvar. Recarregue a lista e abra o artigo de novo.',
    acao: 'recarregar-lista',
    rotuloAcao: 'Recarregar a lista',
  },
  ARTIGO_RESERVADO: {
    orientacao:
      'Este artigo é obrigatório: a rota pública /como-funciona aponta para ele. Editar e publicar continuam liberados — remover e despublicar, não.',
    acao: null,
    rotuloAcao: null,
  },
}

/** Traduz o erro de uma escrita de artigo (I25-I29) no que a tela precisa mostrar. */
export function interpretarErroDeEscritaArtigo(
  erro: unknown,
  origem: OrigemDaEscrita = 'formulario',
): ErroDeEscritaArtigo {
  const codigo = extrairCodigoDeErroApi(erro)
  const recuperacao = codigo ? RECUPERACAO_POR_CODIGO[codigo] : undefined

  return {
    codigo,
    mensagem: mensagemDeErroDeEscrita(erro, origem),
    // O 422 de validação traz os campos culpados; sem repassar, o editor lê "um ou mais campos
    // são inválidos" e não sabe qual.
    errosDeCampo: extrairErrosDeCampo(erro),
    orientacao: recuperacao?.orientacao ?? null,
    acao: recuperacao?.acao ?? null,
    rotuloAcao: recuperacao?.rotuloAcao ?? null,
  }
}
