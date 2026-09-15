import clsx from 'clsx'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ShieldCheck } from 'lucide-react'

export interface SeloVerificacaoProps {
  data: Date
  nota?: string
  className?: string
}

// Sustenta, junto com a afirmação de exaustividade da tabela de campos, a
// leitura de que "campo ausente não se aplica" — conteúdo de confiança, não
// enfeite. Por isso a data é sempre por extenso (nunca formato numérico
// abreviado, que reduziria a legibilidade da afirmação).
export function SeloVerificacao({ data, nota, className }: SeloVerificacaoProps) {
  const dataFormatada = format(data, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  return (
    <p className={clsx('flex items-center gap-1.5 text-xs text-muted', className)}>
      <ShieldCheck className="size-3.5 shrink-0 text-primary-medium" aria-hidden="true" />
      <span>
        Verificado em <strong className="font-semibold text-ink">{dataFormatada}</strong>
        {nota ? ` — ${nota}` : null}
      </span>
    </p>
  )
}
