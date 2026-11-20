import { isAxiosError } from 'axios'

interface EnvelopeErroApi {
  error: {
    code: string
    message: string
    details?: { field: string; message: string }[]
  }
}

function isEnvelopeErroApi(value: unknown): value is EnvelopeErroApi {
  if (typeof value !== 'object' || value === null) return false
  const envelope = value as Record<string, unknown>
  if (typeof envelope.error !== 'object' || envelope.error === null) return false
  const erro = envelope.error as Record<string, unknown>
  return typeof erro.message === 'string'
}

const MENSAGEM_PADRAO = 'Ocorreu um erro inesperado.'

/**
 * Extrai a mensagem de erro do envelope `{ error: { code, message, details? } }`
 * devolvido pela API (ver rules/api.md). Nunca expõe stack trace nem detalhes internos.
 */
export function handleApiError(error: unknown): string {
  if (isAxiosError(error)) {
    const data: unknown = error.response?.data
    if (isEnvelopeErroApi(data)) {
      return data.error.message
    }
    return MENSAGEM_PADRAO
  }
  return MENSAGEM_PADRAO
}

export interface ErroDeCampoApi {
  field: string
  message: string
}

/**
 * Erros por campo do `422 VALIDATION_ERROR`, para o formulário destacar o campo em vez de dizer
 * só "um ou mais campos são inválidos".
 *
 * O backend monta este `details[]` declaradamente para o cliente consumir - e o cliente não
 * consumia. É a mesma junção sem dono que já mordeu esta base: cada lado prova a própria metade
 * e ninguém prova a travessia. Devolve `[]` quando o erro não é de validação de campo.
 */
export function extrairErrosDeCampo(error: unknown): ErroDeCampoApi[] {
  if (!isAxiosError(error)) return []

  const data: unknown = error.response?.data
  if (!isEnvelopeErroApi(data)) return []

  return (data.error.details ?? []).filter(
    (detalhe): detalhe is ErroDeCampoApi =>
      typeof detalhe?.field === 'string' && typeof detalhe?.message === 'string',
  )
}
