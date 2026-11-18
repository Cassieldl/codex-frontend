import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ROTA_DA_ABA } from '../utils/abasDoProvedor'
import { ID_AREA_AVISOS } from '../utils/avisoAncora'

interface LateralDoEnvioModeloProps {
  provedorSlug: string
  totalDeAvisos: number
  codigosDeNatureza: number[]
  totalDeErros: number
}

const CLASSE_LINK = 'font-semibold text-primary-medium underline underline-offset-2'

function formatarListaDeCodigos(codigos: number[]): string {
  if (codigos.length <= 1) return codigos.join('')
  return `${codigos.slice(0, -1).join(', ')} e ${codigos.at(-1)}`
}

/** Lateral do Envio modelo: o que conferir antes da homologação e para onde ir se rejeitar. */
export function LateralDoEnvioModelo({
  provedorSlug,
  totalDeAvisos,
  codigosDeNatureza,
  totalDeErros,
}: LateralDoEnvioModeloProps) {
  const itens: ReactNode[] = ['Os valores são fictícios: troque pelos da sua nota antes de enviar.']

  if (totalDeAvisos > 0) {
    itens.push(
      <>
        Leia os avisos desta versão: muitas rejeições vêm deles.{' '}
        <Link
          to={ROTA_DA_ABA.erros}
          params={{ provedorSlug }}
          hash={ID_AREA_AVISOS}
          className={CLASSE_LINK}
        >
          Ver avisos
        </Link>
      </>,
    )
  }

  if (codigosDeNatureza.length > 0) {
    itens.push(
      <>
        <code className="font-mono">natOp</code> só converte com{' '}
        {codigosDeNatureza.length === 1 ? 'o código' : 'os códigos'}{' '}
        {formatarListaDeCodigos(codigosDeNatureza)}.{' '}
        <Link to={ROTA_DA_ABA.natureza} params={{ provedorSlug }} className={CLASSE_LINK}>
          Ver tabela
        </Link>
      </>,
    )
  }

  return (
    <>
      <section
        aria-labelledby="antes-da-homologacao"
        className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-card"
      >
        <h2 id="antes-da-homologacao" className="text-card-titulo font-bold text-primary">
          Antes de mandar para homologação
        </h2>
        <ol className="flex flex-col gap-3">
          {itens.map((item, indice) => (
            <li key={indice} className="flex gap-3 text-sm leading-relaxed text-ink">
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white"
              >
                {indice + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </section>

      {totalDeErros > 0 && (
        <section
          aria-labelledby="deu-rejeicao"
          className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-card"
        >
          <h2 id="deu-rejeicao" className="text-card-titulo font-bold text-primary">
            Deu rejeição?
          </h2>
          <p className="text-sm text-muted">
            Cole o código do erro na busca: {totalDeErros}{' '}
            {totalDeErros === 1
              ? 'erro deste provedor está documentado'
              : 'erros deste provedor estão documentados'}
            .
          </p>
          <Link
            to={ROTA_DA_ABA.erros}
            params={{ provedorSlug }}
            className={`self-start text-sm ${CLASSE_LINK}`}
          >
            Ir para Erros conhecidos
          </Link>
        </section>
      )}
    </>
  )
}
