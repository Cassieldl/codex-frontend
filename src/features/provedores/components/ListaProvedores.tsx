import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { ProvedorListaItem } from '../types/provedor'

export interface ListaProvedoresProps {
  provedores: ProvedorListaItem[]
}

const MAX_CHIPS_VISIVEIS = 3
const ROTULO_CATEGORIA: Record<ProvedorListaItem['categoria'], string> = {
  Nacional: 'Nacional',
  Proprio: 'Próprio',
}

function formatarData(data: string | null): string {
  if (!data) return 'Ainda não verificado'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(data))
}

function LinhaProvedor({ provedor }: { provedor: ProvedorListaItem }) {
  const [expandido, setExpandido] = useState(false)
  const chipsVisiveis = expandido ? provedor.versoes : provedor.versoes.slice(0, MAX_CHIPS_VISIVEIS)
  const restantes = provedor.versoes.length - chipsVisiveis.length

  return (
    <li className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border p-4 hover:shadow-hover sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <Link
          to="/provedores/$provedorSlug"
          params={{ provedorSlug: provedor.slug }}
          className="text-card-titulo font-medium text-ink hover:underline"
        >
          {provedor.nome}
        </Link>

        {provedor.versoes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {chipsVisiveis.map((versao) => (
              <Link
                key={versao.slug}
                to="/provedores/$provedorSlug/$versaoSlug"
                params={{ provedorSlug: provedor.slug, versaoSlug: versao.slug }}
                className="rounded-[var(--radius-pill)] border border-border px-2 py-0.5 text-xs text-ink hover:shadow-hover"
              >
                {versao.rotulo}
              </Link>
            ))}

            {restantes > 0 && (
              <button
                type="button"
                onClick={() => setExpandido(true)}
                aria-label={`Mostrar mais ${restantes} versões de ${provedor.nome}`}
                className="text-xs font-semibold text-primary-medium hover:underline"
              >
                +{restantes}
              </button>
            )}
          </div>
        )}
      </div>

      <span className="shrink-0 text-right text-xs text-ink/60">
        Verificado em {formatarData(provedor.verificadoEm)}
      </span>
    </li>
  )
}

/** Lista de provedores agrupada por categoria (§7.4) — sem badge de status (PRD explícito). */
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
