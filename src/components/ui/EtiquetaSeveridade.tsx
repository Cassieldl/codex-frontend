import clsx from 'clsx'
import { Info, OctagonAlert, TriangleAlert } from 'lucide-react'
import type { ComponentType } from 'react'

export type Severidade = 'critico' | 'alerta' | 'informativo'

export interface EtiquetaSeveridadeProps {
  severidade: Severidade
  contagem?: number
  /**
   * Só o ícone, na cor da severidade, com o nome como dica e para o leitor de tela. Cada
   * severidade tem um ícone de forma própria: a cor nunca é o único sinal (WCAG 1.4.1).
   */
  somenteIcone?: boolean
  className?: string
}

interface ConfiguracaoSeveridade {
  rotulo: string
  Icone: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  // Pares de cor calculados e testados em §3.2 — nunca token de erro puro
  // como fundo sólido + texto branco (reprova AA, AP-FRONTEND-015).
  textoClasse: string
  fundoClasse: string
}

const CONFIGURACAO: Record<Severidade, ConfiguracaoSeveridade> = {
  critico: {
    rotulo: 'Crítico',
    Icone: OctagonAlert,
    textoClasse: 'text-severidade-critico-texto',
    fundoClasse: 'bg-alert-error',
  },
  alerta: {
    rotulo: 'Alerta',
    Icone: TriangleAlert,
    textoClasse: 'text-severidade-alerta-texto',
    fundoClasse: 'bg-alert-warning',
  },
  informativo: {
    rotulo: 'Informativo',
    Icone: Info,
    textoClasse: 'text-primary-medium',
    fundoClasse: 'bg-alert-info',
  },
}

export function EtiquetaSeveridade({
  severidade,
  contagem,
  somenteIcone = false,
  className,
}: EtiquetaSeveridadeProps) {
  const { rotulo, Icone, textoClasse, fundoClasse } = CONFIGURACAO[severidade]

  if (somenteIcone) {
    return (
      <span
        title={rotulo}
        className={clsx(
          'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
          textoClasse,
          fundoClasse,
          className,
        )}
      >
        <Icone className="size-4" aria-hidden="true" />
        <span className="sr-only">{rotulo}</span>
      </span>
    )
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
        textoClasse,
        fundoClasse,
        className,
      )}
    >
      <Icone className="size-3.5 shrink-0" aria-hidden="true" />
      {rotulo}
      {typeof contagem === 'number' && <span className="normal-case"> ({contagem})</span>}
    </span>
  )
}
