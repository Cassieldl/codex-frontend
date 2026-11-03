import clsx from 'clsx'
import { CircleAlert, Lightbulb, ListChecks, TriangleAlert } from 'lucide-react'
import { useId, type ComponentType, type ReactNode } from 'react'
import type { TipoDeCaixa } from './blocosDoArtigo'

interface ConfiguracaoDaCaixa {
  rotulo: string
  Icone: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  // Pares de rótulo e fundo medidos em `utils/contraste.test.ts`.
  rotuloClasse: string
  molduraClasse: string
}

const CONFIGURACAO: Record<TipoDeCaixa, ConfiguracaoDaCaixa> = {
  resumo: {
    rotulo: 'Resumo rápido',
    Icone: ListChecks,
    rotuloClasse: 'text-primary-medium',
    molduraClasse: 'bg-alert-info border-l-4 border-primary-light p-5 shadow-card',
  },
  dica: {
    rotulo: 'Dica',
    Icone: Lightbulb,
    rotuloClasse: 'text-success',
    molduraClasse: 'bg-alert-success p-4',
  },
  atencao: {
    rotulo: 'Atenção',
    Icone: TriangleAlert,
    rotuloClasse: 'text-severidade-alerta-texto',
    molduraClasse: 'bg-alert-warning p-4',
  },
  importante: {
    rotulo: 'Importante',
    Icone: CircleAlert,
    rotuloClasse: 'text-severidade-critico-texto',
    molduraClasse: 'bg-alert-error p-4',
  },
}

export interface CaixaDestaqueProps {
  tipo: TipoDeCaixa
  children?: ReactNode
}

/** Caixa do corpo do artigo. O rótulo é texto visível: a cor e o ícone nunca são o único sinal. */
export function CaixaDestaque({ tipo, children }: CaixaDestaqueProps) {
  const { rotulo, Icone, rotuloClasse, molduraClasse } = CONFIGURACAO[tipo]
  const rotuloId = useId()

  return (
    <div
      role="note"
      aria-labelledby={rotuloId}
      data-caixa={tipo}
      className={clsx(
        'flex flex-col gap-2 rounded-[var(--radius-control)] text-ink',
        molduraClasse,
      )}
    >
      <p id={rotuloId} className={clsx('flex items-center gap-2 font-semibold', rotuloClasse)}>
        <Icone className="size-4 shrink-0" aria-hidden="true" />
        {rotulo}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}
