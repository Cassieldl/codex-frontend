import { useState } from 'react'
import { ehConflitoDeConcorrencia } from './codigoDeErroApi'

interface ControleDoEnvio {
  abertura: number | null
  etagDaAbertura: string | undefined
  houveConflito: boolean
}

export interface EtagDeEnvio {
  /** O que vai no `If-Match` da próxima tentativa. */
  etag: string | undefined
  /** Chamar no `onError` da escrita: só o 409 de concorrência muda o etag seguinte. */
  registrarErro: (erro: unknown) => void
}

/**
 * If-Match de um formulário ou confirmação aberta. Vale o etag da leitura em que ela abriu, porque
 * é sobre ela que a pessoa decidiu: um refetch de foco que avance o cache não pode transformar a
 * escrita numa sobrescrita sem 409. Só depois de um 409 de concorrência mostrado na tela passa a
 * valer o etag relido.
 *
 * `abertura` identifica o registro aberto e é `null` com tudo fechado; quando muda, o controle
 * recomeça. `etagAtual` é o etag desse registro no cache agora.
 */
export function useEtagDeEnvio(
  abertura: number | null,
  etagAtual: string | undefined,
): EtagDeEnvio {
  const [controle, setControle] = useState<ControleDoEnvio>(() => ({
    abertura,
    etagDaAbertura: etagAtual,
    houveConflito: false,
  }))

  // Ajuste durante a renderização, o padrão do React para estado que depende de prop.
  let vigente = controle
  if (controle.abertura !== abertura) {
    vigente = { abertura, etagDaAbertura: etagAtual, houveConflito: false }
  } else if (controle.etagDaAbertura === undefined && etagAtual !== undefined) {
    vigente = { ...controle, etagDaAbertura: etagAtual }
  }
  if (vigente !== controle) setControle(vigente)

  return {
    etag: vigente.houveConflito ? (etagAtual ?? vigente.etagDaAbertura) : vigente.etagDaAbertura,
    registrarErro: (erro) => {
      if (ehConflitoDeConcorrencia(erro))
        setControle((atual) => ({ ...atual, houveConflito: true }))
    },
  }
}
