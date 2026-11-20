import clsx from 'clsx'
import { ShieldCheck } from 'lucide-react'
import { formatarDataVerificacao } from '../../utils/formatarDataVerificacao'

export interface SeloVerificacaoProps {
  /**
   * A string ISO da API é o formato preferido - converter no chamador com `new Date(iso)` já
   * exibiu o dia anterior aqui, porque data sem horário é lida como UTC.
   */
  data: Date | string
  nota?: string
  className?: string
}

// Sustenta, junto com a afirmação de exaustividade da tabela de campos, a leitura de que "campo
// ausente não se aplica" - conteúdo de confiança, não enfeite. O formato por extenso que isso
// exige mora em `formatarDataVerificacao`, compartilhado com as demais superfícies: enquanto cada
// tela formatava por conta própria, duas caíram no numérico e no abreviado que a regra proíbe.
export function SeloVerificacao({ data, nota, className }: SeloVerificacaoProps) {
  const dataFormatada = formatarDataVerificacao(data)

  return (
    <p className={clsx('flex items-center gap-1.5 text-xs text-muted', className)}>
      <ShieldCheck className="size-3.5 shrink-0 text-primary-medium" aria-hidden="true" />
      <span>
        Verificado em <strong className="font-semibold text-ink">{dataFormatada}</strong>
        {nota ? ` · ${nota}` : null}
      </span>
    </p>
  )
}
