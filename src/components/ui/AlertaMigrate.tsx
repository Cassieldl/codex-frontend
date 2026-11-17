import clsx from 'clsx'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { useId } from 'react'
import type { ComponentType, ReactNode } from 'react'

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
  fundoClasse: string
  // Ícone é sinal não textual: cada par com o fundo é medido a 3:1 em `utils/contraste.test.ts`.
  iconeClasse: string
}

const APARENCIA: Record<TipoAlerta, AparenciaDoAlerta> = {
  informacao: {
    rotulo: 'Informação',
    Icone: Info,
    fundoClasse: 'bg-alert-info',
    iconeClasse: 'text-primary-light',
  },
  sucesso: {
    rotulo: 'Sucesso',
    Icone: CircleCheck,
    fundoClasse: 'bg-alert-success',
    iconeClasse: 'text-success',
  },
  alerta: {
    rotulo: 'Alerta',
    Icone: TriangleAlert,
    fundoClasse: 'bg-alert-warning',
    iconeClasse: 'text-severidade-alerta-texto',
  },
  erro: {
    rotulo: 'Erro',
    Icone: CircleAlert,
    fundoClasse: 'bg-alert-error',
    iconeClasse: 'text-error',
  },
}

/**
 * Alerta do design system Migrate: fundo do tipo, ícone na cor funcional e texto em `ink`.
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
  const { rotulo, Icone, fundoClasse, iconeClasse } = APARENCIA[tipo]
  const tituloId = useId()

  return (
    <div
      role="note"
      aria-labelledby={titulo ? tituloId : undefined}
      aria-label={titulo ? undefined : rotulo}
      data-alerta={tipo}
      className={clsx(
        'flex items-start rounded-[var(--radius-control)] text-ink',
        fundoClasse,
        compacto ? 'gap-2 px-2.5 py-1.5 text-sm' : 'min-h-[60px] gap-3 py-[19px] pr-5 pl-4',
        className,
      )}
    >
      <Icone
        className={clsx('shrink-0', compacto ? 'mt-0.5 size-4' : 'mt-px size-5', iconeClasse)}
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
