import { Check, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { ValorSimNao as Valor } from './blocosDoArtigo'

const CONFIGURACAO = {
  sim: { texto: 'Sim', Icone: Check, classe: 'text-success' },
  nao: { texto: 'Não', Icone: X, classe: 'text-error-texto' },
} as const

export interface ValorSimNaoProps {
  valor: Valor
}

/** Ícone decorativo ao lado do texto: o leitor de tela lê só "Sim" ou "Não". */
export function ValorSimNao({ valor }: ValorSimNaoProps) {
  const { texto, Icone, classe } = CONFIGURACAO[valor]

  return (
    <span className={cn('inline-flex items-center gap-1 font-medium', classe)}>
      <Icone className="size-4 shrink-0" aria-hidden="true" />
      {texto}
    </span>
  )
}
