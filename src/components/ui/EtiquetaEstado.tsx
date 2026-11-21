import { cn } from '../../lib/cn'

export type EstadoPreenchimento = 'obrigatorio' | 'opcional' | 'condicional'

export interface EtiquetaEstadoProps {
  estado: EstadoPreenchimento
  className?: string
}

// §3.3(a) - o papel mais repetido da tela mais densa do produto não pode
// gastar a paleta semântica (reservada para Avisos, §3.3b). Por isso a
// distinção vem só de FORMA da borda + texto literal, nunca de cor de fundo
// nem de tokens de severidade. Cores usadas aqui são neutras/institucionais
// (--color-primary, --color-border), nunca --color-alert-*/--color-error.
//
// M34: tracejado vai para "Condicional", não para "Opcional": tracejado é a
// metáfora natural de "vale sob uma condição", e ignorar um campo condicional
// quando a condição se aplica causa rejeição - risco operacional maior que o
// de um campo opcional, que por isso fica com o tratamento mais fraco (borda
// fina cinza) dos três.
const CONFIGURACAO: Record<EstadoPreenchimento, { rotulo: string; bordaClasse: string }> = {
  obrigatorio: { rotulo: 'Obrigatório', bordaClasse: 'border-2 border-solid border-primary' },
  condicional: { rotulo: 'Condicional', bordaClasse: 'border-2 border-dashed border-primary' },
  opcional: { rotulo: 'Opcional', bordaClasse: 'border border-solid border-border' },
}

export function EtiquetaEstado({ estado, className }: EtiquetaEstadoProps) {
  const { rotulo, bordaClasse } = CONFIGURACAO[estado]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-pill)] bg-transparent px-2.5 py-0.5 text-xs font-medium text-ink',
        bordaClasse,
        className,
      )}
    >
      {rotulo}
    </span>
  )
}
