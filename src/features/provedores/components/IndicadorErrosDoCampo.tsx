import clsx from 'clsx'
import { TriangleAlert } from 'lucide-react'
import type { ErroDoCampo } from '../types/versaoProvedorPagina'

/** Visual do selo de rejeições, repetido na legenda da tabela de campos. */
export const CLASSE_DO_SELO_DE_REJEICOES =
  'inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-border-control bg-alert-warning px-1.5 py-0.5 font-mono text-aux font-semibold text-alert-warning-texto'

export interface IndicadorErrosDoCampoProps {
  erros: ErroDoCampo[]
  nomeDoCampo: string
  /** Abre o detalhe do campo já na seção de rejeições. */
  onVerErros: () => void
}

/**
 * Marca, na própria linha da tabela, que o campo já tem rejeição registrada nesta versão, e
 * quantas. Os códigos não vão na linha: um campo chega a ter mais de dez, e a tabela virava uma
 * lista de etiquetas. O contador abre o detalhe do campo na seção de rejeições, onde cada erro
 * tem título e link. Deve ficar fora do botão do nome do campo: botão dentro de botão é inválido.
 *
 * A cor é a de severidade "alerta", reservada a risco, a mesma paleta dos avisos: o par
 * `alert-warning-texto` sobre `alert-warning` é medido em `utils/contraste.test.ts`. O rótulo
 * acessível sempre traz o número que aparece no selo.
 */
export function IndicadorErrosDoCampo({
  erros,
  nomeDoCampo,
  onVerErros,
}: IndicadorErrosDoCampoProps) {
  if (erros.length === 0) return null

  const quantidade =
    erros.length === 1 ? '1 rejeição registrada' : `as ${erros.length} rejeições registradas`

  return (
    <button
      type="button"
      onClick={onVerErros}
      aria-label={`Ver ${quantidade} no campo ${nomeDoCampo}`}
      title={`Ver ${quantidade} neste campo`}
      className={clsx(
        CLASSE_DO_SELO_DE_REJEICOES,
        'ml-2 align-middle hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover',
      )}
    >
      <TriangleAlert aria-hidden="true" className="size-3 shrink-0" />
      {erros.length}
    </button>
  )
}
