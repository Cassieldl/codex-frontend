import { Link } from '@tanstack/react-router'
import type { CampoRelacionado } from '../types/erro'

export interface ContextoCampoRelacionado {
  provedorSlug: string
  versaoSlug: string
}

export interface CamposRelacionadosProps {
  campos: CampoRelacionado[]
  /**
   * Provedor/versão únicos aplicáveis a este erro, ou `null` quando não há
   * esse contexto (inclusive no caso "sem versões" de U9). Com contexto, cada
   * campo vira link para a âncora do campo dentro daquela versão de provedor;
   * sem contexto, vira link para a resolução pública do campo no Layout
   * InvoiCy, que leva à versão vigente.
   */
  contexto: ContextoCampoRelacionado | null
}

const CLASSE_DO_LINK =
  'inline-flex items-center rounded-[var(--radius-pill)] border border-border px-2.5 py-1 text-sm text-primary-medium hover:underline'

export function CamposRelacionados({ campos, contexto }: CamposRelacionadosProps) {
  if (campos.length === 0) return null

  return (
    <section aria-labelledby="campos-relacionados-titulo" className="flex flex-col gap-2">
      <h2 id="campos-relacionados-titulo" className="text-subtitulo font-semibold text-ink">
        Campos relacionados
      </h2>

      <ul className="flex flex-wrap gap-2">
        {campos.map((campo) => (
          <li key={campo.slug}>
            {contexto ? (
              <Link
                to="/provedores/$provedorSlug/$versaoSlug"
                params={{ provedorSlug: contexto.provedorSlug, versaoSlug: contexto.versaoSlug }}
                hash={`campo-${campo.slug}`}
                className={CLASSE_DO_LINK}
              >
                {campo.nome}
              </Link>
            ) : (
              <Link
                to="/layout/campos/$campoSlug"
                params={{ campoSlug: campo.slug }}
                className={CLASSE_DO_LINK}
              >
                {campo.nome}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
