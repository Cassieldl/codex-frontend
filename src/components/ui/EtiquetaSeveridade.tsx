import { Info, OctagonAlert, TriangleAlert } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '../../lib/cn'

export type Severidade = 'critico' | 'alerta' | 'informativo'

export interface EtiquetaSeveridadeProps {
  severidade: Severidade
  contagem?: number
  /**
   * Só o ícone, na cor da severidade, com o nome como dica e para o leitor de tela. Cada
   * severidade tem um ícone de forma própria: a cor nunca é o único sinal (WCAG 1.4.1).
   */
  somenteIcone?: boolean
  /** Com `somenteIcone`: o ícone solto, sem o círculo de fundo, para lista compacta. */
  semFundo?: boolean
  className?: string
}

interface ConfiguracaoSeveridade {
  rotulo: string
  Icone: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  // Pares de cor calculados e testados em §3.2 - nunca token de erro puro
  // como fundo sólido + texto branco (reprova AA, AP-FRONTEND-015).
  textoClasse: string
  fundoClasse: string
  /** Ícone solto sobre branco: precisa de 3:1 sozinho, sem o fundo tingido. */
  iconeClasse: string
}

const CONFIGURACAO: Record<Severidade, ConfiguracaoSeveridade> = {
  critico: {
    rotulo: 'Crítico',
    Icone: OctagonAlert,
    textoClasse: 'text-alert-error-texto',
    fundoClasse: 'bg-alert-error',
    iconeClasse: 'text-error-texto',
  },
  alerta: {
    rotulo: 'Alerta',
    Icone: TriangleAlert,
    textoClasse: 'text-alert-warning-texto',
    fundoClasse: 'bg-alert-warning',
    iconeClasse: 'text-alert-warning-icone',
  },
  informativo: {
    rotulo: 'Informativo',
    Icone: Info,
    textoClasse: 'text-primary-medium',
    fundoClasse: 'bg-alert-info',
    iconeClasse: 'text-primary-light',
  },
}

export function EtiquetaSeveridade({
  severidade,
  contagem,
  somenteIcone = false,
  semFundo = false,
  className,
}: EtiquetaSeveridadeProps) {
  const { rotulo, Icone, textoClasse, fundoClasse, iconeClasse } = CONFIGURACAO[severidade]

  if (somenteIcone && semFundo) {
    return (
      <span title={rotulo} className={cn('inline-flex shrink-0', iconeClasse, className)}>
        <Icone className="size-4.5" aria-hidden="true" />
        <span className="sr-only">{rotulo}</span>
      </span>
    )
  }

  if (somenteIcone) {
    return (
      <span
        title={rotulo}
        className={cn(
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
      className={cn(
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
