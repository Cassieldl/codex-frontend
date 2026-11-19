import { Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { construirIdLinhaEstrutura } from '../../provedores/utils/destaqueAncora'
import type { FormatoDaEstrutura } from '../types/estruturaLayout'

export interface LinksVerNaEstruturaProps {
  versaoSlug: string
  campoSlug: string
  nomeDoCampo: string
  formatos: readonly FormatoDaEstrutura[]
  /** `compacta` cabe na linha do dicionário; `completa` é o rótulo inteiro, para o modal. */
  variante: 'compacta' | 'completa'
  className?: string
}

const SIGLA_DO_FORMATO: Record<FormatoDaEstrutura, string> = {
  xml: 'XML',
  json: 'JSON',
}

const PROTOCOLO_DO_FORMATO: Record<FormatoDaEstrutura, string> = {
  xml: 'SOAP',
  json: 'REST',
}

const CLASSE_DO_LINK =
  'text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover'

/**
 * Atalho do verbete para a linha da tag na estrutura. A rolagem é da estrutura, nunca do router:
 * dois donos agendando o mesmo scroll invertem a ordem no navegador.
 */
export function LinksVerNaEstrutura({
  versaoSlug,
  campoSlug,
  nomeDoCampo,
  formatos,
  variante,
  className,
}: LinksVerNaEstruturaProps) {
  if (formatos.length === 0) return null

  const compacta = variante === 'compacta'
  // A compacta fica na linha do nome sem quebrar: a linha do dicionário não pode crescer.
  const Raiz = compacta ? 'span' : 'p'

  return (
    <Raiz
      className={clsx(
        compacta
          ? 'inline-flex items-baseline gap-2 whitespace-nowrap'
          : 'flex flex-wrap items-center gap-x-3 gap-y-1',
        className,
      )}
    >
      {formatos.map((formato) => (
        <Link
          key={formato}
          to="/layout/$versaoSlug"
          params={{ versaoSlug }}
          search={{ visao: formato }}
          hash={construirIdLinhaEstrutura(campoSlug)}
          hashScrollIntoView={false}
          title={
            compacta
              ? `Ver na estrutura ${SIGLA_DO_FORMATO[formato]} (${PROTOCOLO_DO_FORMATO[formato]})`
              : undefined
          }
          className={clsx(CLASSE_DO_LINK, compacta ? 'font-medium' : 'font-semibold')}
        >
          {compacta ? (
            // O nome acessível contém o texto visível ("XML") e diz de qual campo é o atalho.
            <>
              <span className="sr-only">Ver {nomeDoCampo} na estrutura </span>
              {SIGLA_DO_FORMATO[formato]}
              <span className="sr-only"> ({PROTOCOLO_DO_FORMATO[formato]})</span>
            </>
          ) : (
            `Ver na estrutura (${SIGLA_DO_FORMATO[formato]})`
          )}
        </Link>
      ))}
    </Raiz>
  )
}
