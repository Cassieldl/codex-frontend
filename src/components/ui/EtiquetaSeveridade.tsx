import clsx from 'clsx'
import { Info, TriangleAlert } from 'lucide-react'
import type { ComponentType } from 'react'

export type Severidade = 'critico' | 'alerta' | 'informativo'

export interface EtiquetaSeveridadeProps {
  severidade: Severidade
  contagem?: number
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
    Icone: TriangleAlert,
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

export function EtiquetaSeveridade({ severidade, contagem, className }: EtiquetaSeveridadeProps) {
  const { rotulo, Icone, textoClasse, fundoClasse } = CONFIGURACAO[severidade]

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
