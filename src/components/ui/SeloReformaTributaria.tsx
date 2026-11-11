import clsx from 'clsx'

export const NOME_DA_REFORMA_TRIBUTARIA = 'Campo da reforma tributária (IBS/CBS)'

export interface SeloReformaTributariaProps {
  className?: string
}

/**
 * Selo "RT" do campo da reforma tributária. Preenchido para se distinguir pela forma dos selos
 * contornados (novo na versão, obrigatoriedade); a cor é a institucional, não a semântica, que é
 * reservada para avisos. A sigla tem o nome por extenso no `title` e para o leitor de tela.
 */
export function SeloReformaTributaria({ className }: SeloReformaTributariaProps) {
  return (
    <span
      title={NOME_DA_REFORMA_TRIBUTARIA}
      data-selo-reforma-tributaria=""
      className={clsx(
        'inline-flex shrink-0 items-center rounded-[var(--radius-pill)] bg-primary px-2 py-px font-sans text-aux font-semibold tracking-wide text-white uppercase',
        className,
      )}
    >
      <span aria-hidden="true">RT</span>
      <span className="sr-only">{NOME_DA_REFORMA_TRIBUTARIA}</span>
    </span>
  )
}
