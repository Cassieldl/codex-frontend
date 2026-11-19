import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, TriangleAlert } from 'lucide-react'
import { CLASSE_CARD_CLICAVEL } from '../../../components/ui/classesDeCard'
import { formatarDataCurta } from '../../../utils/formatarDataVerificacao'
import type { CategoriaProvedorHome, CategoriaProvedoresHome, ProvedorHomeDto } from '../types/home'
import { filtrarProvedoresPorNome } from '../utils/filtrarProvedoresPorNome'

export interface ListaProvedoresHomeProps {
  categorias: CategoriaProvedoresHome[]
  /** Texto digitado no filtro; vazio mostra todos. */
  filtro?: string
}

const ROTULO_CATEGORIA: Record<CategoriaProvedorHome, string> = {
  Nacional: 'Nacional',
  Proprio: 'Próprio',
}

function CardProvedorHome({ provedor }: { provedor: ProvedorHomeDto }) {
  return (
    <li>
      <Link
        to="/provedores/$provedorSlug"
        params={{ provedorSlug: provedor.slug }}
        className={`${CLASSE_CARD_CLICAVEL} group flex h-full flex-col gap-2.5 px-5 py-4 text-primary`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="min-w-0 text-card-titulo font-bold [overflow-wrap:anywhere]">
            {provedor.nome}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {/* Ícone + rótulo acessível: o alerta nunca é comunicado só por cor. */}
            {provedor.temComunicado && (
              <TriangleAlert
                role="img"
                aria-label={`Comunicado ativo para ${provedor.nome}`}
                className="size-4 text-alert-warning-icone"
              />
            )}
            <ArrowRight
              className="size-4 text-primary-light transition-transform duration-150 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </span>
        </span>

        {provedor.verificadoEm ? (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Check className="size-3.5 text-success" aria-hidden="true" />
            Verificado em {formatarDataCurta(provedor.verificadoEm)}
          </span>
        ) : (
          <span className="self-start rounded-[var(--radius-pill)] bg-alert-warning px-2.5 py-0.5 text-xs font-bold text-alert-warning-texto">
            Ainda não verificado
          </span>
        )}
      </Link>
    </li>
  )
}

/**
 * Provedores da Home em cards, agrupados por categoria. Grupo que o filtro esvazia some; se
 * todos somem, a lista diz que nada casou em vez de ficar em branco.
 */
export function ListaProvedoresHome({ categorias, filtro = '' }: ListaProvedoresHomeProps) {
  const filtrando = filtro.trim() !== ''
  const visiveis = categorias
    .map((categoria) => {
      const provedores = filtrarProvedoresPorNome(categoria.provedores, filtro)
      // Sem filtro vale o total do contrato; filtrando, conta o que sobrou na tela.
      return {
        ...categoria,
        provedores,
        quantidade: filtrando ? provedores.length : categoria.total,
      }
    })
    .filter((categoria) => categoria.provedores.length > 0)

  if (visiveis.length === 0) {
    return (
      <p
        role="status"
        className="rounded-[var(--radius-card)] border border-border bg-white px-5 py-4 text-sm text-muted"
      >
        Nenhum provedor com “{filtro.trim()}” no nome.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {visiveis.map((categoria) => (
        <section
          key={categoria.categoria}
          aria-labelledby={`categoria-home-${categoria.categoria}`}
        >
          <div className="mb-3 flex items-center gap-2.5">
            <h3
              id={`categoria-home-${categoria.categoria}`}
              className="text-xs font-bold tracking-wider text-primary-medium uppercase"
            >
              {ROTULO_CATEGORIA[categoria.categoria]}
            </h3>
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">
              {categoria.quantidade} {categoria.quantidade === 1 ? 'provedor' : 'provedores'}
            </span>
          </div>

          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {categoria.provedores.map((provedor) => (
              <CardProvedorHome key={provedor.slug} provedor={provedor} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
