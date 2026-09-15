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
   * esse contexto (inclusive no caso "sem versões" de U9). `M10`: com
   * contexto, cada campo vira link para a âncora do campo dentro daquela
   * versão de provedor; sem contexto, é **texto simples** — nunca link para
   * a página pública do Layout InvoiCy, que não existe nesta fatia.
   */
  contexto: ContextoCampoRelacionado | null
}

export function CamposRelacionados({ campos, contexto }: CamposRelacionadosProps) {
  if (campos.length === 0) return null

  return (
    <section aria-labelledby="campos-relacionados-titulo" className="flex flex-col gap-2">
      <h2 id="campos-relacionados-titulo" className="text-subtitulo font-semibold text-ink">
        Campos relacionados
      </h2>

      <ul className="flex flex-wrap gap-2">
        {campos.map((campo) => (
          <li key={campo.campoLayoutSlug}>
            {contexto ? (
              <Link
                to="/provedores/$provedorSlug/$versaoSlug"
                params={{ provedorSlug: contexto.provedorSlug, versaoSlug: contexto.versaoSlug }}
                hash={`campo-${campo.campoLayoutSlug}`}
                className="inline-flex items-center rounded-[var(--radius-pill)] border border-border px-2.5 py-1 text-sm text-primary-medium hover:underline"
              >
                {campo.nome}
              </Link>
            ) : (
              <span className="inline-flex items-center rounded-[var(--radius-pill)] border border-border px-2.5 py-1 text-sm text-ink">
                {campo.nome}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
