import { Link } from '@tanstack/react-router'
import { ArrowRight, Clock } from 'lucide-react'
import { formatarDataCurta } from '../../../utils/formatarDataVerificacao'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import { useLayoutIndice } from '../../layout/hooks/useLayoutIndice'
import { vigenteAFrenteDoProvedor } from '../utils/layoutDoProvedor'

interface FaixaLayoutDesatualizadoProps {
  versaoLayoutRotulo: string
}

/**
 * Faixa de cuidado abaixo do nome do provedor quando o mapeamento segue um layout anterior ao
 * vigente, com o prazo da vigente e o caminho para o que muda nela. Em dia, não aparece.
 */
export function FaixaLayoutDesatualizado({ versaoLayoutRotulo }: FaixaLayoutDesatualizadoProps) {
  const { data: indice } = useLayoutIndice()
  const vigente = vigenteAFrenteDoProvedor(versaoLayoutRotulo, indice)

  if (!vigente) return null

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[var(--radius-aviso)] border border-alert-warning-borda bg-alert-warning px-4 py-3.5">
      <Clock className="size-5 shrink-0 text-alert-warning-icone" aria-hidden="true" />

      <p className="min-w-0 flex-[1_1_400px] text-sm text-alert-warning-texto">
        Este mapeamento segue o{' '}
        <strong>Layout InvoiCy {formatarVersaoLayout(versaoLayoutRotulo)}</strong>.{' '}
        {vigente.obrigatoriaEm ? (
          <>
            A {formatarVersaoLayout(vigente.rotulo)} é obrigatória em produção em{' '}
            <strong>{formatarDataCurta(vigente.obrigatoriaEm)}</strong>.
          </>
        ) : (
          <>A vigente é a {formatarVersaoLayout(vigente.rotulo)}.</>
        )}
      </p>

      <Link
        to="/layout/$versaoSlug"
        params={{ versaoSlug: vigente.slug }}
        className="inline-flex items-center gap-1 text-sm font-bold text-alert-warning-texto underline underline-offset-4 hover:decoration-2"
      >
        O que muda na {formatarVersaoLayout(vigente.rotulo)}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  )
}
