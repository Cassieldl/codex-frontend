import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { useId } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type TipoAlerta = 'informacao' | 'sucesso' | 'alerta' | 'erro'

export interface AlertaMigrateProps {
  tipo: TipoAlerta
  titulo?: string
  compacto?: boolean
  className?: string
  children: ReactNode
}

interface AparenciaDoAlerta {
  rotulo: string
  Icone: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  // Fundo, borda e texto do tom. Texto e ícone são medidos contra o fundo em `utils/contraste.test.ts`.
  tomClasse: string
  iconeClasse: string
}

const APARENCIA: Record<TipoAlerta, AparenciaDoAlerta> = {
  informacao: {
    rotulo: 'Informação',
    Icone: Info,
    tomClasse: 'border-alert-info-borda bg-alert-info text-primary',
    iconeClasse: 'text-primary-medium',
  },
  sucesso: {
    rotulo: 'Sucesso',
    Icone: CircleCheck,
    tomClasse: 'border-alert-success-borda bg-alert-success text-alert-success-texto',
    iconeClasse: 'text-success',
  },
  alerta: {
    rotulo: 'Alerta',
    Icone: TriangleAlert,
    tomClasse: 'border-alert-warning-borda bg-alert-warning text-alert-warning-texto',
    iconeClasse: 'text-alert-warning-icone',
  },
  erro: {
    rotulo: 'Erro',
    Icone: CircleAlert,
    tomClasse: 'border-alert-error-borda bg-alert-error text-alert-error-texto',
    iconeClasse: 'text-error-texto',
  },
}

/**
 * Alerta do design system Migrate: fundo, borda inteira e texto no tom do tipo, com ícone próprio.
 * Vermelho só para erro: cuidado é âmbar e informação é azul.
 * O padrão tem 60 px de altura mínima e respiro de 16 px à esquerda e 20 px à direita; o
 * compacto cabe numa célula de tabela. Sem título, o tipo vira o nome acessível da nota.
 */
export function AlertaMigrate({
  tipo,
  titulo,
  compacto = false,
  className,
  children,
}: AlertaMigrateProps) {
  const { rotulo, Icone, tomClasse, iconeClasse } = APARENCIA[tipo]
  const tituloId = useId()

  return (
    <div
      role="note"
      aria-labelledby={titulo ? tituloId : undefined}
      aria-label={titulo ? undefined : rotulo}
      data-alerta={tipo}
      className={cn(
        'flex items-start rounded-[var(--radius-aviso)] border',
        tomClasse,
        compacto ? 'gap-2 px-2.5 py-1.5 text-sm' : 'min-h-[60px] gap-3 py-[18px] pr-5 pl-4',
        className,
      )}
    >
      <Icone
        className={cn('shrink-0', compacto ? 'mt-0.5 size-4' : 'mt-px size-5', iconeClasse)}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {titulo && (
          <p id={tituloId} className="font-semibold">
            {titulo}
          </p>
        )}
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </div>
  )
}
