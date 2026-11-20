import { Link } from '@tanstack/react-router'
import { rotuloVerificacao } from '../../../utils/formatarDataVerificacao'
import type { ProvedorListaItem } from '../types/provedor'

export interface ListaProvedoresProps {
  provedores: ProvedorListaItem[]
}

const ROTULO_CATEGORIA: Record<ProvedorListaItem['categoria'], string> = {
  Nacional: 'Nacional',
  Proprio: 'Próprio',
}

function LinhaProvedor({ provedor }: { provedor: ProvedorListaItem }) {
  return (
    <li className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border p-4 hover:shadow-hover sm:flex-row sm:items-center sm:justify-between">
      <Link
        to="/provedores/$provedorSlug"
        params={{ provedorSlug: provedor.slug }}
        className="text-card-titulo font-medium text-ink hover:underline"
      >
        {provedor.nome}
      </Link>

      <span className="shrink-0 text-right text-xs text-muted">
        {rotuloVerificacao(provedor.verificadoEm)}
      </span>
    </li>
  )
}

/** Lista de provedores agrupada por categoria (§7.4) - sem badge de status (PRD explícito). */
export function ListaProvedores({ provedores }: ListaProvedoresProps) {
  const agrupados = new Map<ProvedorListaItem['categoria'], ProvedorListaItem[]>()
  for (const provedor of provedores) {
    const lista = agrupados.get(provedor.categoria) ?? []
    lista.push(provedor)
    agrupados.set(provedor.categoria, lista)
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from(agrupados.entries()).map(([categoria, itens]) => (
        <section key={categoria} aria-labelledby={`categoria-titulo-${categoria}`}>
          <h2
            id={`categoria-titulo-${categoria}`}
            className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted"
          >
            {ROTULO_CATEGORIA[categoria]}
          </h2>
          <ul className="flex flex-col gap-2">
            {itens.map((provedor) => (
              <LinhaProvedor key={provedor.slug} provedor={provedor} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
